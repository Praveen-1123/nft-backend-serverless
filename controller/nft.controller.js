const {to, ReS, ReE, isNull, isEmpty} = require('../services/global.services')
const NFT = require('../models/nft.model')
const Users = require('../models/user.model');
const Likes = require('../models/likes.model')
const Configs = require('../models/configs.model');
const CONFIG = require('../configs/global.configs');

const getNft = async function (nftId, userId) {

    let err, nft;

    if (isNull(nftId)) {
        return ReE({message: 'Please enter nft id', success: false})
    }
    if (isNull(userId)) {
        return ReE({message: 'Please enter user id', success: false})
    }

    [err, nft] = await to(NFT.query("id").eq(nftId)
        .and().where("active").eq("true").exec());

    if (err) {
        console.log("nft::fetch::error", err);
        return ReE({message: 'Get nft error', success: false})
    }
    if (nft.length === 0) {
        return ReE({message: 'NFT not found', success: false})
    }

    let error, likes, user;

    [error, user] = await to(Users.query("id").eq(nft[0].userId)
        .and().where("active").eq("true")
        .attributes(CONFIG.userPopulatable).exec());

    if (error) {
        console.log("user::fetch::error", error);
        return ReE({message: 'Get user error', success: false})
    }
    if (user.length === 0) {
        return ReE({message: 'Author not found', success: false})
    } else {
        nft[0].userId = user[0];
    }

    [error, likes] = await to(Likes.query("active").eq("true").using("active-index")
        .and().where("userId").eq(userId).and().where("nftId").eq(nftId).exec());

    if (error) {
        console.log("likes::fetch::error", error);
        return ReE({message: 'Get likes error', success: false})
    }

    if (likes.length === 0) {
        nft[0].isLiked = false;
    } else {
        nft[0].isLiked = true;
    }

    return ReS({success: true, result: nft})
}
module.exports.getNft = getNft

const getAllNFT = async function (page, time, userId) {

    let err, nfts, config, promises;
    let nextPage, hasNextPage, totalPages, lastPage, extraPage;

    if (isNull(userId)) {
        return ReE({message: 'Please enter user id', success: false})
    }

    if (isNull(time)) {
        time = 'asc';
    }
    if (isNull(page)) {
        page = 1;
    } else {
        page = parseInt(page);
    }

    [err, config] = await to(Configs.query("id").eq("nft-lastpage").exec());

    if (err) {
        console.log("config::query::error", err);
        return ReE({message: 'Config query error', success: false})
    }

    config = config[0];
    totalPages = Math.trunc(config.data);

    if (page > totalPages) {
        return ReE({message: 'Invalid page number', success: false})
    }

    //1,2,3,4...
    if (time === 'desc') {

        lastPage = page;
        extraPage = page + 1;

        if (lastPage === totalPages) {
            nextPage = null;
            hasNextPage = false;
        } else {
            nextPage = page + 1;
            hasNextPage = true;
        }

    } else {

        lastPage = page === 1 ? totalPages : totalPages - 1;
        extraPage = lastPage - 1;

        if (lastPage <= 1) {
            nextPage = null;
            hasNextPage = false;
        } else {
            nextPage = page + 1;
            hasNextPage = true;
        }
    }

    [err, nfts] = await to(NFT.query("active").eq("true").using("active-index")
        .and().where('status').eq('ONSALE')
        .and().where("page").eq(lastPage).exec());

    if (err) {
        console.log("nfts::fetch::error", err);
        return ReE({message: 'Get nfts error', success: false})
    }

    if (nfts.length < 10 && nfts.length !== 0 && hasNextPage) {

        let newNfts;
        [err, newNfts] = await to(NFT.query("active").eq("true").using("active-index")
            .and().where("page").eq(extraPage).exec());

        if (err) {
            console.log("nfts::fetch::error", err);
            return ReE({message: 'Get nfts error', success: false})
        }

        newNfts.forEach(element => {
            nfts.push(element);
        });

        if (extraPage <= 1) {
            nextPage = null;
            hasNextPage = false;
        } else {
            nextPage = page + 1;
            hasNextPage = true;
        }
    }

    if (nfts.length > 0) {
        nfts.sort(function (a, b) {
            var keyA = a.order,
                keyB = b.order;

            if (keyA > keyB) return time === 'desc' ? 1 : -1;
            if (keyA < keyB) return time === 'desc' ? -1 : 1;
            return 0;
        });
        promises = await Promise.all(
            nfts.map(async (nft) => {
                let error, likes, user;

                [error, user] = await to(Users.query("id").eq(nft.userId)
                    .and().where("active").eq("true")
                    .attributes(CONFIG.userPopulatable).exec());

                if (error) {
                    console.log("user::fetch::error", error);
                    return ReE({message: 'Get user error', success: false})
                }

                if (user.length === 0) {
                    var myIndex = nfts.indexOf(nft);
                    nfts.splice(myIndex, 1);
                } else {
                    nft.userId = user[0];
                }

                [error, likes] = await to(Likes.query("active").eq("true").using("active-index")
                    .and().where("userId").eq(userId).and().where("nftId").eq(nft.id).exec());

                if (error) {
                    console.log("likes::fetch::error", error);
                    return ReE({message: 'Get likes error', success: false})
                }

                if (likes.length === 0) {
                    nft.isLiked = false;
                } else {
                    nft.isLiked = true;
                }
            })
        );
    }

    return ReS({
        success: true,
        result: nfts,
        hasNextPage: hasNextPage,
        nextPage: nextPage,
        totalPages: totalPages,
        totalCount: nfts.length
    })
}

module.exports.getAllNFT = getAllNFT

const getNftsWithCategory = async function (body, limit, category, userId) {

    let nfts, promises;
    let nextPage, hasNextPage, totalPages, lastPage, extraPage;
    let lastKey = body.lastKey;
    
    if (isNull(userId)) {
        return ReE({message: 'Please enter user id', success: false})
    }
    if (isNull(limit)) {
        limit = 10;
    }
    if (isNull(category)) {
        category = 'Common';
    }

    try {
        nfts = await NFT.query("active").eq("true").using("active-index")
            .and().where('status').eq('ONSALE').and().where('category').eq(category)
            .and().limit(limit).startAt(lastKey).exec();
    } catch (err) {
        console.log("nfts::fetch::error", err);
        return ReE({message: 'Get nfts error', success: false})
    }
    lastKey = nfts.lastKey;
    nfts = await nfts.populate();

    if (nfts.length > 0) {
        nfts.sort(function (a, b) {
            var keyA = a.order,
                keyB = b.order;

            if (keyA > keyB) return -1;
            if (keyA < keyB) return 1;
            return 0;
        });
        promises = await Promise.all(
            nfts.map(async (nft) => {
                let error, likes;

                [error, likes] = await to(Likes.query("active").eq("true").using("active-index")
                    .and().where("userId").eq(userId).and().where("nftId").eq(nft.id).exec());

                if (error) {
                    console.log("likes::fetch::error", error);
                    return ReE({message: 'Get likes error', success: false})
                }

                if (likes.length === 0) {
                    nft.isLiked = false;
                } else {
                    nft.isLiked = true;
                }
            })
        );
    }

    return ReS({
        success: true,
        result: nfts,
        totalCount: nfts.length,
        lastKey: lastKey
    })
}

module.exports.getNftsWithCategory = getNftsWithCategory
