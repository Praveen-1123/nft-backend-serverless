const {v4: uuidv4} = require('uuid');
const {to, ReS, ReE, isNull, isEmpty} = require('../services/global.services')
const NFT = require('../models/nft.model');
const Users = require('../models/user.model');
const Likes = require('../models/likes.model');
const CONFIG = require('../configs/global.configs');

const likeNFT = async function (nftId, userId) {
    let err, likes, like, nft, user;

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
        return ReE({message: 'Get NFT error', success: false})
    }
    if (nft.length === 0) {
        return ReE({message: 'NFT not found', success: false})
    }

    [err, user] = await to(Users.query("id").eq(userId)
        .and().where("active").eq("true").exec());

    if (err) {
        console.log("user::fetch::error", err);
        return ReE({message: 'Get User error', success: false})
    }
    if (user.length === 0) {
        return ReE({message: 'User not found', success: false})
    }

    let uuid = uuidv4();

    let input = {
        id: uuid,
        userId: userId,
        nftId: nftId,
    };

    [err, likes] = await to(Likes.query("active").eq("true").using("active-index")
        .and().where("userId").eq(userId).and().where("nftId").eq(nftId).exec());

    if (err) {

        console.log("likes::fetch::error", err);
        return ReE({message: 'Get likes error', success: false})
    }

    if (likes.length === 0) {

        [err, like] = await to(Likes.create(input));

        if (err) {
            console.log("like::create::error", err);
            return ReE({message: 'Like create error', success: false})
        }

        [err, nft] = await to(NFT.update({id: nftId},
            {$ADD: {likes: 1}}
        ));

        if (err) {
            console.log("nft::update::error", err);
            return ReE({message: 'NFT update error', success: false})
        }

        return ReS({message: "Liked successfully", success: true})
    }

    return ReE({message: 'You already liked this nft', success: false})
}
module.exports.likeNFT = likeNFT

const getNFTLikes = async function (nftId) {

    let err, likes, user;

    if (isNull(nftId)) {
        return ReE({message: 'Please enter nft id', success: false})
    }

    [err, likes] = await to(Likes.query("active").eq("true")
        .and().where("nftId").eq(nftId).exec());

    if (err) {
        console.log("nft::fetch::error", err);
        return ReE({message: 'Get nft error', success: false})
    }
    
    let promises = await Promise.all(
        likes.map(async (like) => {
            let error, user;

            [error, user] = await to(Users.query("id").eq(like.userId)
                .and().where("active").eq("true")
                .attributes(CONFIG.userPopulatable).exec());

            if (error) {
                console.log("user::fetch::error", error);
                return ReE({message: 'Get user error', success: false})
            }

            if (user.length === 0) {
                var myIndex = likes.indexOf(like);
                likes.splice(myIndex, 1);
            } else {
                like.userId = user[0];
            }
        })
    );

    return ReS({success: true, result: likes})
}
module.exports.getNFTLikes = getNFTLikes

const getUserLikes = async function (userId) {

    let err, likes;

    if (isNull(userId)) {
        return ReE({message: 'Please enter user id', success: false})
    }

    [err, likes] = await to(Likes.query("active").eq("true")
        .and().where("userId").eq(userId).exec());

    if (err) {
        console.log("nft::fetch::error", err);
        return ReE({message: 'Get nft error', success: false})
    }
    
    let promises = await Promise.all(
        likes.map(async (like) => {
            let error, nft;

            [error, nft] = await to(NFT.query("id").eq(like.nftId)
                .and().where("active").eq("true").exec());

            if (error) {
                console.log("nft::fetch::error", error);
                return ReE({message: 'Get nft error', success: false})
            }

            if (nft.length === 0) {
                var myIndex = likes.indexOf(like);
                likes.splice(myIndex, 1);
            } else {
                like.nftId = nft[0];
            }
        })
    );

    return ReS({success: true, result: likes})
}
module.exports.getUserLikes = getUserLikes