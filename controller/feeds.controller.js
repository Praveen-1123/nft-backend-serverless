const {v4: uuidv4} = require('uuid');
const {to, ReS, ReE, isNull, isEmpty} = require('../services/global.services')
const Feeds = require('../models/feeds.model')
const Users = require('../models/user.model');
const Likes = require('../models/feedlikes.model')
const Configs = require('../models/configs.model');

const createFeed = async function (body) {
    let err, feed, user, config, page;
    let uuid = uuidv4();

    var count = await Feeds.scan().count().exec();
    count = count.count;

    if (count === 0) {
        page = 1;
        count = 1;
    } else {
        count = count + 1;
        page = ((count - 1) / 10) + 1;
        page = Math.trunc(page);
    }

    var input = {
        id: uuid,
        attachments: body.attachments,
        userId: body.userId,
        title: body.title,
        order: count,
        page: page,
        feedType: body.feedType || "Feed",
        description: body.description || "None",
        tags: body.tags || []
    };

    if (isNull(input.userId)) {
        return ReE({message: 'Please enter user id', success: false})
    }
    if (isNull(input.title)) {
        return ReE({message: 'Please enter a title', success: false})
    }
    if (isNull(input.attachments) || isEmpty(input.attachments)) {
        return ReE({message: 'Please enter some attachments', success: false})
    }

    [err, user] = await to(Users.query("id").eq(input.userId)
        .and().where("active").eq("true").exec());

    if (err) {
        console.log("user::fetch::error", err);
        return ReE({message: 'User fetch error', success: false})
    }

    if (user.length === 0) {
        return ReE({message: 'User not found', success: false})
    }

    [err, feed] = await to(Feeds.create(input));

    if (err) {
        console.log("feed::create::error", err);
        return ReE({message: 'Feed create error', success: false})
    }

    [err, config] = await to(Configs.query("id").eq("feed-lastpage").exec());

    if (err) {
        console.log("config::query::error", err);
        return ReE({message: 'Config query error', success: false})
    }

    if (config.length === 0) {

        var input = {
            id: "feed-lastpage",
            data: page.toString()
        };

        [err, config] = await to(Configs.create(input));
        if (err) {
            console.log("config::create::error", err);
            return ReE({message: 'Config create error', success: false})
        }
    }
    else {

        config = config[0];

        if (Math.trunc(config.data) !== page) {

            [err, config] = await to(Configs.update(
                {id: "feed-lastpage"},
                {data: page.toString()}
            ));

            if (err) {
                console.log("config::update::error", err);
                return ReE({message: 'Config update error', success: false})
            }
        }
    }

    return ReS({success: true, result: feed})

}

module.exports.createFeed = createFeed

const getFeed = async function (feedId, userId) {

    let err, feed;

    if (isNull(feedId)) {
        return ReE({message: 'Please enter feed id', success: false})
    }
    if (isNull(userId)) {
        return ReE({message: 'Please enter user id', success: false})
    }

    [err, feed] = await to(Feeds.query("id").eq(feedId)
        .and().where("active").eq("true").exec());

    if (err) {
        console.log("feed::fetch::error", err);
        return ReE({message: 'Get feed error', success: false})
    }

    let error, likes, user;

    [error, user] = await to(Users.query("id").eq(feed[0].userId)
        .and().where("active").eq("true")
        .attributes(['id', 'userName', 'imageUrl', 'firstName', 'lastName']).exec());

    if (error) {
        console.log("user::fetch::error", error);
        return ReE({message: 'Get user error', success: false})
    }
    if (user.length === 0) {
        return ReE({message: 'Author not found', success: false})
    } else {
        feed[0].userId = user[0];
    }

    [error, likes] = await to(Likes.query("active").eq("true").using("active-index")
        .and().where("userId").eq(userId).and().where("feedId").eq(feedId).exec());

    if (error) {
        console.log("likes::fetch::error", error);
        return ReE({message: 'Get likes error', success: false})
    }

    if (likes.length === 0) {
        feed[0].isLiked = false;
    } else {
        feed[0].isLiked = true;
    }

    return ReS({success: true, result: feed})

}

module.exports.getFeed = getFeed

const getAllFeeds = async function (page, time, userId) {

    let err, feeds, config, promises;
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

    [err, config] = await to(Configs.query("id").eq("feed-lastpage").exec());

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

    [err, feeds] = await to(Feeds.query("active").eq("true").using("active-index")
        .and().where("page").eq(lastPage).exec());

    if (err) {

        console.log("feeds::fetch::error", err);
        return ReE({message: 'Get feeds error', success: false})
    }
    
    if (feeds.length < 10 && feeds.length !== 0 && hasNextPage) {

        let newFeeds;
        [err, newFeeds] = await to(Feeds.query("active").eq("true").using("active-index")
            .and().where("page").eq(extraPage).exec());

        if (err) {
            console.log("feeds::fetch::error", err);
            return ReE({message: 'Get feeds error', success: false})
        }

        newFeeds.forEach(element => {
            feeds.push(element);
        });

        if (extraPage <= 1) {
            nextPage = null;
            hasNextPage = false;
        } else {
            nextPage = page + 1;
            hasNextPage = true;
        }
    }

    if (feeds.length > 0) {
        feeds.sort(function (a, b) {
            var keyA = a.order,
                keyB = b.order;

            if (keyA > keyB) return time === 'desc' ? 1 : -1;
            if (keyA < keyB) return time === 'desc' ? -1 : 1;
            return 0;
        });
        promises = await Promise.all(
            feeds.map(async (feed) => {
                let error, likes, user;

                [error, user] = await to(Users.query("id").eq(feed.userId)
                    .and().where("active").eq("true")
                    .attributes(['id', 'userName', 'imageUrl', 'firstName', 'lastName']).exec());

                if (error) {
                    console.log("user::fetch::error", error);
                    return ReE({message: 'Get user error', success: false})
                }

                if (user.length === 0) {
                    var myIndex = feeds.indexOf(feed);
                    feeds.splice(myIndex, 1);
                } else {
                    feed.userId = user[0];
                }

                [error, likes] = await to(Likes.query("active").eq("true").using("active-index")
                    .and().where("userId").eq(userId).and().where("feedId").eq(feed.id).exec());

                if (error) {
                    console.log("likes::fetch::error", error);
                    return ReE({message: 'Get likes error', success: false})
                }

                if (likes.length === 0) {
                    feed.isLiked = false;
                } else {
                    feed.isLiked = true;
                }
            })
        );
    }

    return ReS({
        success: true,
        result: feeds,
        hasNextPage: hasNextPage,
        nextPage: nextPage,
        totalPages: totalPages
    })

}

module.exports.getAllFeeds = getAllFeeds
