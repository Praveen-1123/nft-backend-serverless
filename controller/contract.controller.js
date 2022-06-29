const AWS = require('aws-sdk');
const {ethers} = require("ethers");
const {v4: uuidv4} = require('uuid');
const {to, ReS, ReE, isNull, isEmpty} = require('../services/global.services.node')
const NFT = require('../models/nft.model');
const Users = require('../models/user.model');
const Configs = require('../models/configs.model');
const Activity = require('../models/activity.model');
const CONFIG = require('../configs/global.configs');

const Nft721Json = require('../json/Nft721.json')
const Nft1155Json = require('../json/Nft1155.json')
const Market721Json = require('../json/Market721.json')
const Market1155Json = require('../json/Market1155.json')
const provider = new ethers.providers.JsonRpcProvider(CONFIG.rinkeby_rpc);

const s3bucket = new AWS.S3({
    accessKeyId: CONFIG.accessKeyId,
    secretAccessKey: CONFIG.secretAccessKey
});

const mint = async (req, res) => {
    
    let err, nft, activity, newUser, config, page, contract, createTx, receipt;
    let body = req.body;
    let user = req.user;
     
    let uuid = uuidv4();
    var count = await NFT.scan().count().exec();
    let tokenId = Math.floor(1000000000 + Math.random() * 9000000000);
    count = count.count;

    if (count === 0) {
        page = 1;
        count = 1;
    } else {
        count = count + 1;
        page = ((count - 1) / 10) + 1;
        page = Math.trunc(page);
    }

    if (isNull(body.title)) {
        return ReE(res, {message: 'Please enter a title', success: false})
    }
    if (isNull(body.tokenPrice)) {
        return ReE(res, {message: 'Please enter token price', success: false})
    }
    if (body.tokenPrice <= 0) {
        return ReE(res, {message: 'Please enter a valid token price', success: false})
    }
    if (isNull(body.totalSupply)) {
        return ReE(res, {message: 'Please enter a supply for token', success: false})
    }
    if (body.totalSupply <= 0) {
        return ReE(res, {message: 'Please enter a valid supply for token', success: false})
    }
    if (body.royalty > 10) {
        return ReE(res, {message: 'Royalty can not be upto 10%', success: false})
    }
    if (isNull(body.attachments) || isEmpty(body.attachments)) {
        return ReE(res, {message: 'Please enter some attachments', success: false})
    }
    if (isNull(body.privateKey)) {
        return ReE(res, {message: 'Please enter privatekey to mint', success: false})
    }

    var input = {
        id: uuid,
        page: page,
        order: count,
        userId: user.uid,
        tokenId: tokenId,
        title: body.title,
        creatorId: user.uid,
        category: body.category,
        royalty: body.royalty || 5,
        tokenPrice: body.tokenPrice,
        totalSupply: body.totalSupply,
        attachments: body.attachments,
        chainName: body.chainName || 'Ethereum',
        description: body.description || 'None',
        assetType: body.totalSupply > 1 ? 'ERC-1155' : 'ERC-721',
        nftAddress: body.totalSupply > 1 ? CONFIG.nft_contract_1155 : CONFIG.nft_contract_721,
        marketAddress: body.totalSupply > 1 ? CONFIG.market_contract_1155 : CONFIG.market_contract_721
    };

    var s3data = {
        name: input.title,
        description: input.description,
        image: input.attachments[0].url
    };

    const s3params = {
        Bucket: CONFIG.bucket_name,
        Key: 'metadata/' + tokenId + ".json",
        Body: Buffer.from(JSON.stringify(s3data)),
        ContentType: "application/json"
    };

    [err, newUser] = await to(Users.query("id").eq(input.userId)
        .and().where("active").eq("true").exec());

    if (err) {
        console.log("user::fetch::error", err);
        return ReE(res, {message: 'User fetch error', success: false})
    }

    if (newUser.length === 0) {
        return ReE(res, {message: 'User not found', success: false})
    }
    
    let tokenPrice = ethers.utils.parseEther(input.tokenPrice.toString());
    const wallet = new ethers.Wallet(body.privateKey, provider);
    
    if(body.totalSupply === 1){
        
        contract = new ethers.Contract(
            CONFIG.market_contract_721,
            Market721Json.abi,
            wallet
        );
        
        try {
            let estimateGas = await contract.estimateGas.safeMintAsset(
                tokenId, tokenPrice, input.royalty
            );
            console.log("EstimatedGas", estimateGas.toString());
        } catch (error) {
            console.error("Gas estimation failed!", error);
            return ReE(res, {message: 'Gas estimation failed!', success: false})
        }
        
        createTx = await contract.safeMintAsset(tokenId, tokenPrice, input.royalty);
        input.txHash = createTx.hash;
    }else{
        
        contract = new ethers.Contract(
            CONFIG.market_contract_1155,
            Market1155Json.abi,
            wallet
        );
        
        try {
            let estimateGas = await contract.estimateGas.createToken(
                input.totalSupply, tokenId, input.royalty
            );
            console.log("EstimatedGas", estimateGas.toString());
        } catch (error) {
            console.error("Gas estimation failed!", error);
            return ReE(res, {message: 'Gas estimation failed!', success: false})
        }
        
        createTx = await contract.createToken(input.totalSupply, tokenId, input.royalty);
        input.txHash = createTx.hash;
    }

    let s3Upload;
    [err, s3Upload] = await to(s3bucket.putObject(s3params).promise());

    if (err) {
        console.log("s3::upload::error", err);
        return ReE(res, {message: 'S3 upload error', success: false})
    }

    input.metadata = "https://marketplace-nft.s3.amazonaws.com/metadata/" + tokenId + ".json";

    [err, nft] = await to(NFT.create(input));

    if (err) {
        console.log("nft::create::error", err);
        return ReE(res, {message: 'NFT create error', success: false})
    }
    
    let activityInput = {
        id: uuidv4(),
        nftId: nft.id,
        userId: user.uid,
        amount: input.totalSupply,
        assetType: body.totalSupply > 1 ? 'ERC-1155' : 'ERC-721',
        tokenId: tokenId,
        tokenPrice: input.tokenPrice,
        txHash: input.txHash
    };
    
    [err, activity] = await to(Activity.create(activityInput));

    if (err) {
        console.log("activity::create::error", err);
        return ReE(res, {message: 'Activity create error', success: false})
    }

    [err, config] = await to(Configs.query("id").eq("nft-lastpage").exec());

    if (err) {
        console.log("config::query::error", err);
        return ReE(res, {message: 'Config query error', success: false})
    }

    if (config.length === 0) {

        var input = {
            id: "nft-lastpage",
            data: page.toString()
        };

        [err, config] = await to(Configs.create(input));
        if (err) {
            console.log("config::create::error", err);
            return ReE(res, {message: 'Config create error', success: false})
        }
    }
    else {

        config = config[0];

        if (Math.trunc(config.data) !== page) {

            [err, config] = await to(Configs.update(
                {id: "nft-lastpage"},
                {data: page.toString()}
            ));

            if (err) {
                console.log("config::update::error", err);
                return ReE(res, {message: 'Config update error', success: false})
            }
        }
    }
    res.status(200).send({success: true, result: nft});
    
    let status;
    receipt = await createTx.wait();
    
    if(receipt.status === 1){
        status = 'MINTED';
    }else{
        status = 'FAILED';
    }
    [err, nft] = await to(NFT.update({id: nft.id}, {status: status}));
    if(err){
        return console.log("nftmint::update::error", err);
    }
    [err, activity] = await to(Activity.update({id: activity.id}, {status: status}));
    if(err){
        return console.log("nftmint::update::error", err);
    }
    console.log("Mint status updated for id:", nft.id)
}
module.exports.mint = mint

const putOnSale = async (req, res) => {
    
    let err, nft, activity, newActivity, newUser, config, page, contract, nftContract, createTx, receipt;
    
    let body = req.body;
    let user = req.user;
    let uuid = uuidv4();
    let itemId = Math.floor(1000000000 + Math.random() * 9000000000);

    if (isNull(body.actId)) {
        return ReE(res, {message: 'Please enter a activity Id', success: false})
    }
    if (isNull(body.privateKey)) {
        return ReE(res, {message: 'Please enter your privateKey', success: false})
    }

    [err, newUser] = await to(Users.query("id").eq(user.uid)
        .and().where("active").eq("true").exec());

    if (err) {
        console.log("user::fetch::error", err);
        return ReE(res, {message: 'User fetch error', success: false})
    }

    if (newUser.length === 0) {
        return ReE(res, {message: 'User not found', success: false})
    }
    
    [err, activity] = await to(Activity.query("id").eq(body.actId)
        .and().where("active").eq("true").exec());

    if (err) {
        console.log("activity::fetch::error", err);
        return ReE(res, {message: 'Activity fetch error', success: false})
    }

    if (activity.length === 0) {
        return ReE(res, {message: 'Activity not found', success: false})
    }
    
    if (newUser.length === 0) {
        return ReE(res, {message: 'User not found', success: false})
    }
    activity = activity[0];
    
    [err, nft] = await to(NFT.query("id").eq(activity.nftId)
        .and().where("active").eq("true").exec());

    if (err) {
        console.log("nft::fetch::error", err);
        return ReE(res, {message: 'NFT fetch error', success: false})
    }

    if (nft.length === 0) {
        return ReE(res, {message: 'NFT not found', success: false})
    }
    nft = nft[0];
   
    if(activity.assetType === 'ERC-1155' && isNull(body.amount)){
        return ReE(res, {message: 'Please enter amount to put on sale', success: false})
    }
    
    let tokenAmount = activity.assetType === 'ERC-1155' ? parseInt(body.amount) : 1;
    
    if(tokenAmount <= 0){
        return ReE(res, {message: 'Please enter a valid amount to purchase', success: false})
    }
    
    let activityInput = {
        id: uuidv4(),
        nftId: nft.id,
        userId: user.uid,
        amount: tokenAmount,
        assetType: activity.assetType,
        tokenId: activity.tokenId,
        tokenPrice: activity.tokenPrice,
        itemId: itemId
    };
    
    if (activity.amount < activityInput.amount) {
        return ReE(res, {message: 'Can not create sale more than minted amount', success: false})
    }
    
    let tokenPrice = ethers.utils.parseEther(activityInput.tokenPrice.toString());
    const wallet = new ethers.Wallet(body.privateKey, provider);
    
    if(activity.assetType === 'ERC-1155' && !isNull(body.tokenPrice) && body.tokenPrice > 0){
        activityInput.tokenPrice = body.tokenPrice;
        tokenPrice = ethers.utils.parseEther(body.tokenPrice.toString());
    }
    
    if(activity.assetType === 'ERC-721'){
        
        contract = new ethers.Contract(
            CONFIG.nft_contract_721,
            Nft721Json.abi,
            wallet
        );
        
        try {
            let estimateGas = await contract.estimateGas.approve(
                CONFIG.market_contract_721, activity.tokenId
            );
            console.log("EstimatedGas", estimateGas.toString());
        } catch (error) {
            console.error("Gas estimation failed!", error);
            return ReE(res, {message: 'Gas estimation failed!', success: false})
        }
        createTx = await contract.approve(CONFIG.market_contract_721, activity.tokenId);
        activityInput.txHash = createTx.hash;
    }else{
        
        nftContract = new ethers.Contract(
            CONFIG.nft_contract_1155,
            Nft1155Json.abi,
            wallet
        );
        contract = new ethers.Contract(
            CONFIG.market_contract_1155,
            Market1155Json.abi,
            wallet
        );
        
        try {
            let estimateGas = await contract.estimateGas.createSaleItem(
                CONFIG.nft_contract_1155, activity.tokenId, 
                tokenPrice, tokenAmount, itemId
            );
            console.log("EstimatedGas", estimateGas.toString());
        } catch (error) {
            console.error("Gas estimation failed!", error);
            return ReE(res, {message: 'Gas estimation failed!', success: false})
        }
        
        let approvalStatus = await nftContract.isApprovedForAll(wallet.address, CONFIG.market_contract_1155);
        
        if(!approvalStatus){
            let approveContract = await nftContract.setApprovalForAll(CONFIG.market_contract_1155, true);
            let approveTx = await approveContract.wait();
            if(approveTx.status !== 1){
                return ReE(res, {message: 'Approval failed. Chain error!', success: false})
            }
        }
        
        createTx = await contract.createSaleItem(
            CONFIG.nft_contract_1155, activity.tokenId, 
            tokenPrice, tokenAmount, itemId
        );
        activityInput.txHash = createTx.hash;
    }
    
    [err, newActivity] = await to(Activity.create(activityInput));

    if (err) {
        console.log("activity::create::error", err);
        return ReE(res, {message: 'Activity create error', success: false})
    }
    
    let saleCount = activity.amount - tokenAmount;
    
    [err, activity] = await to(Activity.update({id: activity.id}, {amount: saleCount}));

    if (err) {
        console.log("activity::update::error", err);
        return ReE(res, {message: 'Activity update error', success: false})
    }
    
    res.status(200).send({success: true, result: newActivity});
    
    receipt = await createTx.wait();
    
    if(receipt.status === 1){
        [err, nft] = await to(NFT.update({id: nft.id}, {status: "ONSALE", stockAvailable: nft.stockAvailable + tokenAmount}));
        if(err){
            return console.log("putonsalenft::update::error", err);
        }
        [err, newActivity] = await to(Activity.update({id: newActivity.id}, {status: "ONSALE"}));
        if(err){
            return console.log("putonsaleactivity::update::error", err);
        }
    }else{
        [err, newActivity] = await to(Activity.update({id: newActivity.id}, {status: "FAILED"}));
        if(err){
            return console.log("putonsaleactivity::update::error", err);
        }
        [err, activity] = await to(Activity.update({id: activity.id}, {amount: activity.amount + tokenAmount}));
        if(err){
            return console.log("putonsaleactivity::update::error", err);
        }
    }
    console.log("Create Sale updated for id:", activity.id)
}

module.exports.putOnSale = putOnSale

const buyNft = async (req, res) => {
    
    let err, nft, activity, newActivity, newUser, config, page, contract, nftContract, createTx, receipt;
    
    let body = req.body;
    let user = req.user;
    let uuid = uuidv4();

    if (isNull(body.actId)) {
        return ReE(res, {message: 'Please enter a activity Id', success: false})
    }
    if (isNull(body.privateKey)) {
        return ReE(res, {message: 'Please enter your privateKey', success: false})
    }

    [err, newUser] = await to(Users.query("id").eq(user.uid)
        .and().where("active").eq("true").exec());

    if (err) {
        console.log("user::fetch::error", err);
        return ReE(res, {message: 'User fetch error', success: false})
    }

    if (newUser.length === 0) {
        return ReE(res, {message: 'User not found', success: false})
    }
    
    [err, activity] = await to(Activity.query("id").eq(body.actId)
        .and().where("active").eq("true").exec());

    if (err) {
        console.log("activity::fetch::error", err);
        return ReE(res, {message: 'Activity fetch error', success: false})
    }

    if (activity.length === 0) {
        return ReE(res, {message: 'Activity not found', success: false})
    }
    
    if (newUser.length === 0) {
        return ReE(res, {message: 'User not found', success: false})
    }
    activity = activity[0];
    
    [err, nft] = await to(NFT.query("id").eq(activity.nftId)
        .and().where("active").eq("true").exec());

    if (err) {
        console.log("nft::fetch::error", err);
        return ReE(res, {message: 'NFT fetch error', success: false})
    }

    if (nft.length === 0) {
        return ReE(res, {message: 'NFT not found', success: false})
    }
    nft = nft[0];
   
    if(activity.assetType === 'ERC-1155' && isNull(body.amount)){
        return ReE(res, {message: 'Please enter amount to purchase', success: false})
    }
    
    let tokenAmount = activity.assetType === 'ERC-1155' ? parseInt(body.amount) : 1;
    
    if(tokenAmount <= 0){
        return ReE(res, {message: 'Please enter a valid amount to purchase', success: false})
    }
    
    let activityInput = {
        id: uuid,
        nftId: nft.id,
        userId: user.uid,
        amount: tokenAmount,
        assetType: activity.assetType,
        tokenId: activity.tokenId,
        tokenPrice: activity.tokenPrice,
        itemId: activity.itemId
    };
    
    if (activity.amount < tokenAmount) {
        return ReE(res, {message: 'Can not create sale more than minted amount', success: false})
    }
    
    let tokenPrice;
    const wallet = new ethers.Wallet(body.privateKey, provider);
    
    if(activity.assetType === 'ERC-721'){
        
        contract = new ethers.Contract(
            CONFIG.market_contract_721,
            Market721Json.abi,
            wallet
        );
        
        tokenPrice = await contract.getTokenPrice(activity.tokenId);
        if (tokenPrice.toString() === "0") {
            return ReE(res, {message: `No token found with id: ${activity.tokenId}`, success: false})
        }
        try {
            let estimateGas = await contract.estimateGas.buyNFT(
                activity.tokenId, {value: tokenPrice}
            );
            console.log("EstimatedGas", estimateGas.toString());
        } catch (error) {
            console.error("Gas estimation failed!", error);
            return ReE(res, {message: 'Gas estimation failed!', success: false})
        }
        
        createTx = await contract.buyNFT(
            activity.tokenId, {value: tokenPrice}
        );
        activityInput.txHash = createTx.hash;
    }else{
        
        contract = new ethers.Contract(
            CONFIG.market_contract_1155,
            Market1155Json.abi,
            wallet
        );
        
        tokenPrice = await contract.getTokenPrice(
            CONFIG.nft_contract_1155, activity.tokenId, activity.itemId
        );
        if (tokenPrice.toString() === "0") {
            return ReE(res, {message: `No token found with id: ${activity.tokenId}`, success: false})
        }
        try {
            let estimateGas = await contract.estimateGas.buyToken(
                CONFIG.nft_contract_1155, activity.tokenId, 
                activity.itemId, tokenAmount, {value: tokenPrice}
            );
            console.log("EstimatedGas", estimateGas.toString());
        } catch (error) {
            console.error("Gas estimation failed!", error);
            return ReE(res, {message: 'Gas estimation failed!', success: false})
        }
        createTx = await contract.buyToken(
            CONFIG.nft_contract_1155, activity.tokenId, 
            activity.itemId, tokenAmount, { value: tokenPrice }
        );
        activityInput.txHash = createTx.hash;
    }
    
    [err, newActivity] = await to(Activity.create(activityInput));

    if (err) {
        console.log("activity::create::error", err);
        return ReE(res, {message: 'Activity create error', success: false})
    }
    
    let saleCount = activity.amount - tokenAmount;
    let activityStatus;
    if(saleCount <= 0){
        activityStatus = 'SOLD';
    }else{
        activityStatus = activity.status;
    }
    
    [err, activity] = await to(Activity.update({id: activity.id}, 
        {amount: saleCount, status: activityStatus}));

    if (err) {
        console.log("activity::update::error", err);
        return ReE(res, {message: 'Activity update error', success: false})
    }
    
    res.status(200).send({success: true, result: newActivity});
    
    receipt = await createTx.wait();
    
    if(receipt.status === 1){
        [err, nft] = await to(NFT.update({id: nft.id}, {stockAvailable: nft.stockAvailable - tokenAmount}));
        if(err){
            return console.log("buynft::update::error", err);
        }
        [err, newActivity] = await to(Activity.update({id: newActivity.id}, {status: "BOUGHT"}));
        if(err){
            return console.log("buyactivity::update::error", err);
        }
    }else{
        [err, newActivity] = await to(Activity.update({id: newActivity.id}, {status: "FAILED"}));
        if(err){
            return console.log("buyactivity::update::error", err);
        }
        [err, activity] = await to(Activity.update({id: activity.id}, 
            {amount: activity.amount + tokenAmount, status: "ONSALE"}));
        if(err){
            return console.log("buyactivity::update::error", err);
        }
    }
    console.log("Buy nft updated for id:", activity.id)
}

module.exports.buyNft = buyNft

const updatePrice = async (req, res) => {
    
    let err, nft, activity, newActivity, newUser, config, page, contract, nftContract, createTx, receipt;
    
    let body = req.body;
    let user = req.user;
    let uuid = uuidv4();

    if (isNull(body.actId)) {
        return ReE(res, {message: 'Please enter a activity Id', success: false})
    }
    if (isNull(body.privateKey)) {
        return ReE(res, {message: 'Please enter your privateKey', success: false})
    }
    if (isNull(body.tokenPrice)) {
        return ReE(res, {message: 'Please enter new tokenPrice', success: false})
    }

    [err, newUser] = await to(Users.query("id").eq(user.uid)
        .and().where("active").eq("true").exec());

    if (err) {
        console.log("user::fetch::error", err);
        return ReE(res, {message: 'User fetch error', success: false})
    }

    if (newUser.length === 0) {
        return ReE(res, {message: 'User not found', success: false})
    }
    
    [err, activity] = await to(Activity.query("id").eq(body.actId)
        .and().where("active").eq("true").exec());

    if (err) {
        console.log("activity::fetch::error", err);
        return ReE(res, {message: 'Activity fetch error', success: false})
    }

    if (activity.length === 0) {
        return ReE(res, {message: 'Activity not found', success: false})
    }
    
    if (newUser.length === 0) {
        return ReE(res, {message: 'User not found', success: false})
    }
    activity = activity[0];
    
    if(activity.assetType === 'ERC-1155'){
        return ReE(res, {message: 'Can not update price for ERC-1155 tokens',
            success: false})
    }
    
    // if(activity.status === 'ONSALE'){
    //     return ReE(res, {message: 'Item is not in sale. Put on sale to change price',
    //         success: false})
    // }
    
    [err, nft] = await to(NFT.query("id").eq(activity.nftId)
        .and().where("active").eq("true").exec());

    if (err) {
        console.log("nft::fetch::error", err);
        return ReE(res, {message: 'NFT fetch error', success: false})
    }

    if (nft.length === 0) {
        return ReE(res, {message: 'NFT not found', success: false})
    }
    nft = nft[0];
    
    let tokenPrice = ethers.utils.parseEther(body.tokenPrice.toString());
   
    let activityInput = {
        id: uuid,
        nftId: nft.id,
        userId: user.uid,
        amount: activity.amount,
        assetType: activity.assetType,
        tokenId: activity.tokenId,
        tokenPrice: body.tokenPrice
    };
    
    const wallet = new ethers.Wallet(body.privateKey, provider);
    
    if(activity.assetType === 'ERC-721'){
        
        contract = new ethers.Contract(
            CONFIG.market_contract_721,
            Market721Json.abi,
            wallet
        );
        
        try {
            let estimateGas = await contract.estimateGas.updatePrice(
                activity.tokenId, tokenPrice
            );
            console.log("EstimatedGas", estimateGas.toString());
        } catch (error) {
            console.error("Gas estimation failed!", error);
            return ReE(res, {message: 'Gas estimation failed!', success: false})
        }
        
        createTx = await contract.updatePrice(
            activity.tokenId, tokenPrice
        );
        activityInput.txHash = createTx.hash;
    }else{
        
        contract = new ethers.Contract(
            CONFIG.market_contract_1155,
            Market1155Json.abi,
            wallet
        );
        
        try {
            let estimateGas = await contract.estimateGas.updateSalePrice(
                CONFIG.nft_contract_1155, activity.tokenId, 
                activity.itemId, tokenPrice
            );
            console.log("EstimatedGas", estimateGas.toString());
        } catch (error) {
            console.error("Gas estimation failed!", error);
            return ReE(res, {message: 'Gas estimation failed!', success: false})
        }
        createTx = await contract.updateSalePrice(
            CONFIG.nft_contract_1155, activity.tokenId, 
            activity.itemId, tokenPrice
        );
        activityInput.txHash = createTx.hash;
    }
    
    [err, newActivity] = await to(Activity.create(activityInput));

    if (err) {
        console.log("activity::create::error", err);
        return ReE(res, {message: 'Activity create error', success: false})
    }
    let oldPrice = activity.tokenPrice;
    
    [err, activity] = await to(Activity.update({id: activity.id}, 
        {tokenPrice: body.tokenPrice}));

    if (err) {
        console.log("activity::update::error", err);
        return ReE(res, {message: 'Activity update error', success: false})
    }
    
    res.status(200).send({success: true, result: newActivity});
    
    receipt = await createTx.wait();
    
    if(receipt.status === 1){
        [err, nft] = await to(NFT.update({id: nft.id},
            {tokenPrice: body.tokenPrice}));
        if(err){
            return console.log("updatepricenft::update::error", err);
        }
        [err, newActivity] = await to(Activity.update({id: newActivity.id},
            {status: "PRICEUPDATED"}));
        if(err){
            return console.log("updatepriceactivity::update::error", err);
        }
    }else{
        [err, newActivity] = await to(Activity.update({id: newActivity.id},
            {status: "FAILED"}));
        if(err){
            return console.log("updatepriceactivity::update::error", err);
        }
        [err, activity] = await to(Activity.update({id: activity.id}, 
            {tokenPrice: oldPrice}));
        if(err){
            return console.log("updatepriceactivity::update::error", err);
        }
    }
    console.log("Price updated for id:", activity.id)
}

module.exports.updatePrice = updatePrice

const burnNft = async (req, res) => {
    
    let err, nft, activity, newActivity, newUser, config, page, contract, nftContract, createTx, receipt;
    
    let body = req.body;
    let user = req.user;
    let uuid = uuidv4();

    if (isNull(body.actId)) {
        return ReE(res, {message: 'Please enter a activity Id', success: false})
    }
    if (isNull(body.privateKey)) {
        return ReE(res, {message: 'Please enter your privateKey', success: false})
    }

    [err, newUser] = await to(Users.query("id").eq(user.uid)
        .and().where("active").eq("true").exec());

    if (err) {
        console.log("user::fetch::error", err);
        return ReE(res, {message: 'User fetch error', success: false})
    }

    if (newUser.length === 0) {
        return ReE(res, {message: 'User not found', success: false})
    }
    
    [err, activity] = await to(Activity.query("id").eq(body.actId)
        .and().where("active").eq("true").exec());

    if (err) {
        console.log("activity::fetch::error", err);
        return ReE(res, {message: 'Activity fetch error', success: false})
    }

    if (activity.length === 0) {
        return ReE(res, {message: 'Activity not found', success: false})
    }
    
    if (newUser.length === 0) {
        return ReE(res, {message: 'User not found', success: false})
    }
    activity = activity[0];
    
    [err, nft] = await to(NFT.query("id").eq(activity.nftId)
        .and().where("active").eq("true").exec());

    if (err) {
        console.log("nft::fetch::error", err);
        return ReE(res, {message: 'NFT fetch error', success: false})
    }

    if (nft.length === 0) {
        return ReE(res, {message: 'NFT not found', success: false})
    }
    nft = nft[0];
    
    if(activity.assetType === 'ERC-1155' && isNull(body.amount)){
        return ReE(res, {message: 'Please enter amount to put on sale', success: false})
    }
    
    let burnAmount = activity.assetType === 'ERC-1155' ? parseInt(body.amount) : 1;
    
    if(burnAmount <= 0){
        return ReE(res, {message: 'Please enter a valid amount to burn', success: false})
    }
    if(activity.amount < burnAmount){
        return ReE(res, {message: 'Can not burn more than you own', success: false})
    }
   
    let activityInput = {
        id: uuid,
        nftId: nft.id,
        userId: user.uid,
        amount: burnAmount,
        assetType: activity.assetType,
        tokenId: activity.tokenId,
        tokenPrice: activity.tokenPrice
    };
    
    const wallet = new ethers.Wallet(body.privateKey, provider);
    
    if(activity.assetType === 'ERC-721'){
        
        contract = new ethers.Contract(
            CONFIG.nft_contract_721,
            Nft721Json.abi,
            wallet
        );
        
        try {
            let estimateGas = await contract.estimateGas.burn(activity.tokenId);
            console.log("EstimatedGas", estimateGas.toString());
        } catch (error) {
            console.error("Gas estimation failed!", error);
            return ReE(res, {message: 'Gas estimation failed!', success: false})
        }
        
        createTx = await contract.burn(activity.tokenId);
        activityInput.txHash = createTx.hash;
    }else{
        
        contract = new ethers.Contract(
            CONFIG.nft_contract_1155,
            Nft1155Json.abi,
            wallet
        );
        
        try {
            let estimateGas = await contract.estimateGas.burn(
                wallet.address, activity.tokenId, burnAmount);
            console.log("EstimatedGas", estimateGas.toString());
        } catch (error) {
            console.error("Gas estimation failed!", error);
            return ReE(res, {message: 'Gas estimation failed!', success: false})
        }
        createTx = await contract.burn(
            wallet.address, activity.tokenId, burnAmount);
        activityInput.txHash = createTx.hash;
    }
    
    [err, newActivity] = await to(Activity.create(activityInput));

    if (err) {
        console.log("activity::create::error", err);
        return ReE(res, {message: 'Activity create error', success: false})
    }
    
    [err, activity] = await to(Activity.update({id: activity.id}, 
        {amount: activity.amount - burnAmount}));

    if (err) {
        console.log("activity::update::error", err);
        return ReE(res, {message: 'Activity update error', success: false})
    }
    
    res.status(200).send({success: true, result: newActivity});
    
    receipt = await createTx.wait();
    
    if(receipt.status === 1){
        [err, nft] = await to(NFT.update({id: nft.id},
            {stockAvailable: activity.amount - burnAmount}));
        if(err){
            return console.log("burnnft::update::error", err);
        }
        [err, newActivity] = await to(Activity.update({id: newActivity.id},
            {status: "BURNT"}));
        if(err){
            return console.log("burnactivity::update::error", err);
        }
    }else{
        [err, newActivity] = await to(Activity.update({id: newActivity.id},
            {status: "FAILED"}));
        if(err){
            return console.log("burnactivity::update::error", err);
        }
        [err, activity] = await to(Activity.update({id: activity.id}, 
            {amount: activity.amount + burnAmount}));
        if(err){
            return console.log("burnactivity::update::error", err);
        }
    }
    console.log("Burn event updated for id:", activity.id)
}

module.exports.burnNft = burnNft