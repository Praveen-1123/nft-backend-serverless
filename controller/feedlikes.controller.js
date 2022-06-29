const {v4: uuidv4} = require('uuid');
const {to, ReS, ReE, isNull, isEmpty} = require('../services/global.services')
const Feed = require('../models/feeds.model');
const Users = require('../models/user.model');
const Likes = require('../models/feedlikes.model');
const CONFIG = require('../configs/global.configs');

const likeFeed = async function (feedId, userId) {
    let err, likes, like, feed, user;

    if (isNull(feedId)) {
        return ReE({message: 'Please enter feed id', success: false})
    }
    if (isNull(userId)) {
        return ReE({message: 'Please enter user id', success: false})
    }

    [err, feed] = await to(Feed.query("id").eq(feedId)
        .and().where("active").eq("true").exec());

    if (err) {
        console.log("feed::fetch::error", err);
        return ReE({message: 'Get Feed error', success: false})
    }
    if (feed.length === 0) {
        return ReE({message: 'Feed not found', success: false})
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
        feedId: feedId,
    };

    [err, likes] = await to(Likes.query("active").eq("true").using("active-index")
        .and().where("userId").eq(userId).and().where("feedId").eq(feedId).exec());

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

        [err, feed] = await to(Feed.update({id: feedId},
            {$ADD: {likes: 1}}
        ));

        if (err) {
            console.log("feed::update::error", err);
            return ReE({message: 'Feed update error', success: false})
        }

        return ReS({message: "Liked successfully", success: true})
    }

    return ReE({message: 'You already liked this feed', success: false})
}
module.exports.likeFeed = likeFeed

const getFeedLikes = async function (feedId) {

    let err, likes, user;

    if (isNull(feedId)) {
        return ReE({message: 'Please enter feed id', success: false})
    }

    [err, likes] = await to(Likes.query("active").eq("true")
        .and().where("feedId").eq(feedId).exec());

    if (err) {
        console.log("feed::fetch::error", err);
        return ReE({message: 'Get feed error', success: false})
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
module.exports.getFeedLikes = getFeedLikes

const getUserLikes = async function (userId) {

    let err, likes;

    if (isNull(userId)) {
        return ReE({message: 'Please enter user id', success: false})
    }

    [err, likes] = await to(Likes.query("active").eq("true")
        .and().where("userId").eq(userId).exec());

    if (err) {
        console.log("feed::fetch::error", err);
        return ReE({message: 'Get feed error', success: false})
    }
    
    let promises = await Promise.all(
        likes.map(async (like) => {
            let error, feed;

            [error, feed] = await to(Feed.query("id").eq(like.feedId)
                .and().where("active").eq("true").exec());

            if (error) {
                console.log("feed::fetch::error", error);
                return ReE({message: 'Get feed error', success: false})
            }

            if (feed.length === 0) {
                var myIndex = likes.indexOf(like);
                likes.splice(myIndex, 1);
            } else {
                like.feedId = feed[0];
            }
        })
    );

    return ReS({success: true, result: likes})
}
module.exports.getUserLikes = getUserLikes