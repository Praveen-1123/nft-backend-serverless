const {v4: uuidv4} = require('uuid');
const {to, ReS, ReE, isNull, isEmpty} = require('../services/global.services')
const Feed = require('../models/feeds.model');
const Users = require('../models/user.model');
const Comment = require('../models/feedcomment.model');
const CONFIG = require('../configs/global.configs');

const addComment = async function (body, userId) {
    let err, comment, feed, user;
    
    let feedId = body.feedId;
    let commentStr = body.comment;

    if (isNull(feedId)) {
        return ReE({message: 'Please enter feed id', success: false})
    }
    if (isNull(userId)) {
        return ReE({message: 'Please enter user id', success: false})
    }
    if (isNull(commentStr) || isEmpty(commentStr)) {
        return ReE({message: 'Please enter a comment', success: false})
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
        comment: commentStr
    };

    [err, comment] = await to(Comment.create(input));

    if (err) {
        console.log("comment::create::error", err);
        return ReE({message: 'Comment create error', success: false})
    }

    [err, feed] = await to(Feed.update({id: feedId},
        {$ADD: {comments: 1}}
    ));

    if (err) {
        console.log("feed::update::error", err);
        return ReE({message: 'Feed update error', success: false})
    }

    return ReS({message: "Comment added successfully", success: true})
}
module.exports.addComment = addComment

const getComments = async function (feedId) {

    let err, comments, user;

    if (isNull(feedId)) {
        return ReE({message: 'Please enter feed id', success: false})
    }

    [err, comments] = await to(Comment.query("active").eq("true")
        .and().where("feedId").eq(feedId).exec());

    if (err) {
        console.log("feed::fetch::error", err);
        return ReE({message: 'Get feed error', success: false})
    }

    let promises = await Promise.all(
        comments.map(async (comment) => {
            let error, user;

            [error, user] = await to(Users.query("id").eq(comment.userId)
                .and().where("active").eq("true")
                .attributes(CONFIG.userPopulatable).exec());

            if (error) {
                console.log("user::fetch::error", error);
                return ReE({message: 'Get user error', success: false})
            }

            if (user.length === 0) {
                var myIndex = comments.indexOf(comment);
                comments.splice(myIndex, 1);
            } else {
                comment.userId = user[0];
            }
        })
    );

    return ReS({success: true, result: comments})
}
module.exports.getComments = getComments
