const {v4: uuidv4} = require('uuid');
const {to, ReS, ReE, isNull, isEmpty} = require('../services/global.services')
const Users = require('../models/user.model');
const Follow = require('../models/follow.model');
const CONFIG = require('../configs/global.configs');

const follow = async function (followId, userId) {
    let err, follows, follow, currentUser, followUser;

    if (isNull(userId)) {
        return ReE({message: 'Please enter user id', success: false})
    }
    if (isNull(followId)) {
        return ReE({message: 'Please enter following id', success: false})
    }
    if(userId === followId){
        return ReE({message: 'Can not follow yourself', success: false})
    }

    [err, currentUser] = await to(Users.query("id").eq(userId)
        .and().where("active").eq("true").exec());

    if (err) {
        console.log("user::fetch::error", err);
        return ReE({message: 'Get User error', success: false})
    }
    if (currentUser.length === 0) {
        return ReE({message: 'User not found', success: false})
    }
    
    [err, followUser] = await to(Users.query("id").eq(followId)
        .and().where("active").eq("true").exec());

    if (err) {
        console.log("user::fetch::error", err);
        return ReE({message: 'Get User error', success: false})
    }
    if (followUser.length === 0) {
        return ReE({message: 'Following user not found', success: false})
    }

    let uuid = uuidv4();
    let input = {
        id: uuid,
        userId: userId,
        followId: followId
    };

    [err, follows] = await to(Follow.query("active").eq("true").using("active-index")
        .and().where("userId").eq(userId).and().where("followId").eq(followId).exec());

    if (err) {
        console.log("follows::fetch::error", err);
        return ReE({message: 'Get follows error', success: false})
    }

    if (follows.length === 0) {

        [err, follow] = await to(Follow.create(input));

        if (err) {
            console.log("follow::create::error", err);
            return ReE({message: 'Follow create error', success: false})
        }

        [err, currentUser] = await to(Users.update({id: userId},
            {$ADD: {followings: 1}}
        ));

        if (err) {
            console.log("user::update::error", err);
            return ReE({message: 'User update error', success: false})
        }
        
        [err, followUser] = await to(Users.update({id: followId},
            {$ADD: {followers: 1}}
        ));

        if (err) {
            console.log("user::update::error", err);
            return ReE({message: 'User update error', success: false})
        }

        return ReS({message: "Followed successfully", success: true})
    }

    return ReE({message: 'You are already following this user', success: false})
}
module.exports.follow = follow

const unfollow = async function (unfollowId, userId) {
    let err, follows, follow, currentUser, unfollowUser;
    
    if (isNull(userId)) {
        return ReE({message: 'Please enter user id', success: false})
    }
    if (isNull(unfollowId)) {
        return ReE({message: 'Please enter following id', success: false})
    }
    if(userId === unfollowId){
        return ReE({message: 'Can not follow yourself', success: false})
    }

    [err, currentUser] = await to(Users.query("id").eq(userId)
        .and().where("active").eq("true").exec());

    if (err) {
        console.log("user::fetch::error", err);
        return ReE({message: 'Get User error', success: false})
    }
    if (currentUser.length === 0) {
        return ReE({message: 'User not found', success: false})
    }
    
    [err, unfollowUser] = await to(Users.query("id").eq(unfollowId)
        .and().where("active").eq("true").exec());

    if (err) {
        console.log("user::fetch::error", err);
        return ReE({message: 'Get User error', success: false})
    }
    if (unfollowUser.length === 0) {
        return ReE({message: 'Following user not found', success: false})
    }

    let uuid = uuidv4();

    [err, follows] = await to(Follow.query("active").eq("true").using("active-index")
        .and().where("userId").eq(userId).and().where("followId").eq(unfollowId).exec());

    if (err) {
        console.log("follows::fetch::error", err);
        return ReE({message: 'Get follows error', success: false})
    }

    if (follows.length !== 0) {

        [err, follow] = await to(Follow.update({id: follows[0].id}, {active: "false"}));

        if (err) {
            console.log("follow::update::error", err);
            return ReE({message: 'Follow update error', success: false})
        }

        [err, currentUser] = await to(Users.update({id: userId},
            {followings: currentUser[0].followings - 1 }
        ));

        if (err) {
            console.log("user::update::error", err);
            return ReE({message: 'User update error', success: false})
        }
        
        [err, unfollowUser] = await to(Users.update({id: unfollowId},
            {followers: unfollowUser[0].followers - 1}
        ));

        if (err) {
            console.log("user::update::error", err);
            return ReE({message: 'User update error', success: false})
        }

        return ReS({message: "Unfollowed successfully", success: true})
    }

    return ReE({message: 'You are not following this user', success: false})
}
module.exports.unfollow = unfollow

const getFollowers = async function (userId) {

    let err, follows, user;

    if (isNull(userId)) {
        return ReE({message: 'Please enter user id', success: false})
    }

    [err, follows] = await to(Follow.query("active").eq("true")
        .and().where("followId").eq(userId).exec());

    if (err) {
        console.log("follow::fetch::error", err);
        return ReE({message: 'Get follow error', success: false})
    }
    
    let promises = await Promise.all(
        follows.map(async (follow) => {
            let error, user;

            [error, user] = await to(Users.query("id").eq(follow.userId)
                .and().where("active").eq("true")
                .attributes(CONFIG.userPopulatable).exec());

            if (error) {
                console.log("user::fetch::error", error);
                return ReE({message: 'Get user error', success: false})
            }

            if (user.length === 0) {
                var myIndex = follows.indexOf(follow);
                follows.splice(myIndex, 1);
            } else {
                follow.userId = user[0];
            }
        })
    );

    return ReS({success: true, result: follows})
}
module.exports.getFollowers = getFollowers

const getFollowings = async function (userId) {

    let err, follows, user;

    if (isNull(userId)) {
        return ReE({message: 'Please enter user id', success: false})
    }

    [err, follows] = await to(Follow.query("active").eq("true")
        .and().where("userId").eq(userId).exec());

    if (err) {
        console.log("follow::fetch::error", err);
        return ReE({message: 'Get follow error', success: false})
    }
    
    let promises = await Promise.all(
        follows.map(async (follow) => {
            let error, user;

            [error, user] = await to(Users.query("id").eq(follow.followId)
                .and().where("active").eq("true")
                .attributes(CONFIG.userPopulatable).exec());

            if (error) {
                console.log("user::fetch::error", error);
                return ReE({message: 'Get user error', success: false})
            }

            if (user.length === 0) {
                var myIndex = follows.indexOf(follow);
                follows.splice(myIndex, 1);
            } else {
                follow.userId = user[0];
            }
        })
    );

    return ReS({success: true, result: follows})
}
module.exports.getFollowings = getFollowings