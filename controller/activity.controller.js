const dynamoose = require("dynamoose");
const {v4: uuidv4} = require('uuid');
const {to, ReS, ReE, isNull, isEmpty} = require('../services/global.services')
const NFT = require('../models/nft.model');
const Users = require('../models/user.model');
const Activity = require('../models/activity.model')
const CONFIG = require('../configs/global.configs');

const getNFTActivity = async function (nftId, userId) {

    let err, activities, user;

    if (isNull(nftId)) {
        return ReE({message: 'Please enter nft id', success: false})
    }
    if (isNull(userId)) {
        return ReE({message: 'Please enter user id', success: false})
    }

    [err, activities] = await to(Activity.query("active").eq("true")
        .and().where("nftId").eq(nftId).exec());

    if (err) {
        console.log("nft::fetch::error", err);
        return ReE({message: 'Get nft error', success: false})
    }
    
    let buyable = false;
    let sellable = false;
    let burnable = false;
    let upgradable = false;
    
    let promises = await Promise.all(
        activities.map(async (activity) => {
            let error, user;

            [error, user] = await to(Users.query("id").eq(activity.userId)
                .and().where("active").eq("true")
                .attributes(CONFIG.userPopulatable).exec());

            if (error) {
                console.log("user::fetch::error", error);
                return ReE({message: 'Get user error', success: false})
            }

            if (user.length === 0) {
                var myIndex = activities.indexOf(activity);
                activities.splice(myIndex, 1);
                return
            } else {
                activity.userId = user[0];
            }
            if(activity.status === 'ONSALE' && activity.amount !== 0 && activity.userId.id !== userId){
                buyable = true;
            }
            if(activity.status === 'ONSALE' && activity.amount !== 0 && activity.userId.id === userId){
                upgradable = true;
                burnable = true;
            }
            if(activity.status === 'MINTED' && activity.amount !== 0 && activity.userId.id === userId){
                sellable = true;
                burnable = true;
            }
            if(activity.status === 'BOUGHT' && activity.amount !== 0 && activity.userId.id === userId){
                sellable = true;
                burnable = true;
            }
        })
    );

    return ReS({success: true, result: {
        activities: activities,
        buyable: buyable,
        sellable: sellable,
        burnable: burnable,
        upgradable: upgradable
    }})
}
module.exports.getNFTActivity = getNFTActivity

const getUserActivity = async function (userId) {

    let err, activities;

    if (isNull(userId)) {
        return ReE({message: 'Please enter user id', success: false})
    }

    [err, activities] = await to(Activity.query("active").eq("true")
        .and().where("userId").eq(userId).exec());

    if (err) {
        console.log("nft::fetch::error", err);
        return ReE({message: 'Get nft error', success: false})
    }
    
    let promises = await Promise.all(
        activities.map(async (activity) => {
            let error, nft;

            [error, nft] = await to(NFT.query("id").eq(activity.nftId)
                .and().where("active").eq("true").exec());

            if (error) {
                console.log("nft::fetch::error", error);
                return ReE({message: 'Get nft error', success: false})
            }

            if (nft.length === 0) {
                var myIndex = activities.indexOf(activity);
                activities.splice(myIndex, 1);
            } else {
                activity.nftId = nft[0];
            }
        })
    );

    return ReS({success: true, result: activities})
}
module.exports.getUserActivity = getUserActivity

const getBuyable = async function (nftId, userId) {

    let err, activities;

    if (isNull(nftId)) {
        return ReE({message: 'Please enter nft id', success: false})
    }
    if (isNull(userId)) {
        return ReE({message: 'Please enter user id', success: false})
    }

    [err, activities] = await to(Activity.query("active").eq("true")
        .and().where('nftId').eq(nftId)
        .and().where('status').eq('ONSALE')
        .and().where('amount').not().eq(0)
        .and().where("userId").not().eq(userId).exec());

    if (err) {
        console.log("nft::fetch::error", err);
        return ReE({message: 'Get nft error', success: false})
    }

    return ReS({success: true, result: activities})
}
module.exports.getBuyable = getBuyable

const getSellable = async function (nftId, userId) {

    let err, activities;

    if (isNull(nftId)) {
        return ReE({message: 'Please enter nft id', success: false})
    }
    if (isNull(userId)) {
        return ReE({message: 'Please enter user id', success: false})
    }

    [err, activities] = await to(Activity.query("active").eq("true")
        .and().where('nftId').eq(nftId).and()
        .parenthesis(new dynamoose.Condition()
        .where('status').eq('MINTED')
        .or().where('status').eq('BOUGHT'))
        .and().where('amount').not().eq(0)
        .and().where("userId").eq(userId).exec());

    if (err) {
        console.log("nft::fetch::error", err);
        return ReE({message: 'Get nft error', error: err, success: false})
    }

    return ReS({success: true, result: activities})
}
module.exports.getSellable = getSellable

const getUserCollectibles = async function (userId) {

    let err, activities;

    if (isNull(userId)) {
        return ReE({message: 'Please enter user id', success: false})
    }

    [err, activities] = await to(Activity.query("active").eq("true")
        .and().parenthesis(new dynamoose.Condition()
        .where('status').eq('BOUGHT')
        .or().where('status').eq('ONSALE')
        .or().where('status').eq('MINTED'))
        .and().where('amount').not().eq(0)
        .and().where("userId").eq(userId).exec());

    if (err) {
        console.log("nft::fetch::error", err);
        return ReE({message: 'Get nft error', success: false})
    }
    
    let promises = await Promise.all(
        activities.map(async (activity) => {
            let error, nft, user;

            [error, nft] = await to(NFT.query("id").eq(activity.nftId)
                .and().where("active").eq("true").exec());

            if (error) {
                console.log("nft::fetch::error", error);
                return ReE({message: 'Get nft error', success: false})
            }

            if (nft.length === 0) {
                var myIndex = activities.indexOf(activity);
                activities.splice(myIndex, 1);
            } else {
                activity.nftId = nft[0];
            }
            [error, user] = await to(Users.query("id").eq(activity.userId)
                .and().where("active").eq("true").attributes(CONFIG.userPopulatable)
                .exec());

            if (error) {
                console.log("user::fetch::error", error);
                return ReE({message: 'Get user error', success: false})
            }

            if (user.length === 0) {
                var myIndex = activities.indexOf(activity);
                activities.splice(myIndex, 1);
            } else {
                activity.nftId.userId = user[0];
            }
        })
    );

    return ReS({success: true, result: activities})
}
module.exports.getUserCollectibles = getUserCollectibles