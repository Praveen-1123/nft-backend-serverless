const {ReS, ReE, ReN, ReA, isNull, isEmpty} = require('../services/global.services');
const UserController = require('../controller/user.controller');
const NftController = require('../controller/nft.controller');
const LikesController = require('../controller/likes.controller');
const CommentController = require('../controller/comment.controller');
const FollowController = require('../controller/follow.controller');
const FeedController = require('../controller/feeds.controller')
const FeedLikesController = require('../controller/feedlikes.controller');
const FeedCommentController = require('../controller/feedcomment.controller');
const ActivityController = require('../controller/activity.controller')

const {verifyTokenLambda} = require('../middleware/verify')

const v1routes = async function (event) {
    let response, user;
    let query = event.queryStringParameters;
    let path = event.pathParameters;
    let body = event.body;
    isNull(query) ? query = {} : null
    isNull(path) ? path = {} : null
    isNull(body) ? body = '{}' : null

    switch (true) {
        //users routes
        case event.httpMethod === 'POST' && event.path === '/v1/user':
            response = await UserController.register(JSON.parse(body));
            break;
        case event.httpMethod === 'PUT' && event.path === '/v1/user/resetpassword':
            user = await verifyTokenLambda(event.headers);
            response = user ? await UserController.resetPassword(user, JSON.parse(body)) : ReA();
            break;
        case event.httpMethod === 'GET' && event.path === '/v1/user':
            response = await UserController.getUser(query.userId);
            break;
        case event.httpMethod === 'GET' && event.path === '/v1/user/wallet':
            response = await UserController.getUserByAddress(query.address);
            break;
        case event.httpMethod === 'PUT' && event.path === '/v1/user':
            user = await verifyTokenLambda(event.headers);
            response = user ? await UserController.updateUser(user, JSON.parse(body)) : ReA();
            break;
        case event.httpMethod === 'GET' && event.path === '/v1/users':
            response = await UserController.getAllUsers();
            break;
        //nft routes
        case event.httpMethod === 'GET' && event.path === '/v1/nft':
            user = await verifyTokenLambda(event.headers);
            response = user ? await NftController.getNft(query.nftId, user.uid) : ReA();
            break;
        case event.httpMethod === 'GET' && event.path === '/v1/nfts':
            user = await verifyTokenLambda(event.headers);
            response = user ? await NftController.getAllNFT(query.page, query.time, user.uid) : ReA();
            break;
        case event.httpMethod === 'POST' && event.path === '/v1/nfts':
            user = await verifyTokenLambda(event.headers);
            response = user ? await NftController.getNftsWithCategory(
                JSON.parse(body),query.limit, query.category, user.uid) : ReA();
            break;
        //likes routes
        case event.httpMethod === 'PUT' && event.path === '/v1/nft/likes':
            user = await verifyTokenLambda(event.headers);
            response = user ? await LikesController.likeNFT(query.nftId, user.uid) : ReA();
            break;
        case event.httpMethod === 'GET' && event.path === '/v1/nft/likes':
            response = await LikesController.getNFTLikes(query.nftId);
            break;
        case event.httpMethod === 'GET' && event.path === '/v1/user/likes':
            user = await verifyTokenLambda(event.headers);
            response = user ? await LikesController.getUserLikes(user.uid) : ReA();
            break;
        //comment routes
        case event.httpMethod === 'PUT' && event.path === '/v1/nft/comment':
            user = await verifyTokenLambda(event.headers);
            response = user ? await CommentController.addComment(JSON.parse(body), user.uid) : ReA();
            break;
        case event.httpMethod === 'GET' && event.path === '/v1/nft/comment':
            response = await CommentController.getComments(query.nftId);
            break;
        //follow routes
        case event.httpMethod === 'POST' && event.path === '/v1/follow':
            user = await verifyTokenLambda(event.headers);
            response = user ? await FollowController.follow(query.followId, user.uid) : ReA();
            break;
        case event.httpMethod === 'POST' && event.path === '/v1/unfollow':
            user = await verifyTokenLambda(event.headers);
            response = user ? await FollowController.unfollow(query.unfollowId, user.uid) : ReA();
            break;
        case event.httpMethod === 'GET' && event.path === '/v1/followers':
            response = await FollowController.getFollowers(query.userId);
            break;
        case event.httpMethod === 'GET' && event.path === '/v1/followings':
            response = await FollowController.getFollowings(query.userId);
            break;
        //feeds routes
        case event.httpMethod === 'POST' && event.path === '/v1/feed':
            user = await verifyTokenLambda(event.headers);
            response = user ? await FeedController.createFeed(JSON.parse(event.body)) : ReA();
            break;
        case event.httpMethod === 'GET' && event.path === '/v1/feed':
            user = await verifyTokenLambda(event.headers);
            response = user ? await FeedController.getFeed(query.feedId, user.uid) : ReA();
            break;
        case event.httpMethod === 'GET' && event.path === '/v1/feeds':
            user = await verifyTokenLambda(event.headers);
            response = user ? await FeedController.getAllFeeds(query.page, query.time, user.uid) : ReA();
            break;
        //feed likes routes
        case event.httpMethod === 'PUT' && event.path === '/v1/feed/likes':
            user = await verifyTokenLambda(event.headers);
            response = user ? await FeedLikesController.likeFeed(query.feedId, user.uid) : ReA();
            break;
        case event.httpMethod === 'GET' && event.path === '/v1/feed/likes':
            response = await FeedLikesController.getFeedLikes(query.feedId);
            break;
        case event.httpMethod === 'GET' && event.path === '/v1/user/feedlikes':
            user = await verifyTokenLambda(event.headers);
            response = user ? await FeedLikesController.getUserLikes(user.uid) : ReA();
            break;
        //feed comment routes
        case event.httpMethod === 'PUT' && event.path === '/v1/feed/comment':
            user = await verifyTokenLambda(event.headers);
            response = user ? await FeedCommentController.addComment(JSON.parse(body), user.uid) : ReA();
            break;
        case event.httpMethod === 'GET' && event.path === '/v1/feed/comment':
            response = await FeedCommentController.getComments(query.feedId);
            break;
        //activity
        case event.httpMethod === 'GET' && event.path === '/v1/user/collectibles':
            response = await ActivityController.getUserCollectibles(query.userId);
            break;
        case event.httpMethod === 'GET' && event.path === '/v1/user/activity':
            user = await verifyTokenLambda(event.headers);
            response = user ? await ActivityController.getUserActivity(user.uid) : ReA();
            break;
        case event.httpMethod === 'GET' && event.path === '/v1/nft/activity':
            user = await verifyTokenLambda(event.headers);
            response = user ? await ActivityController.getNFTActivity(query.nftId, user.uid) : ReA();
            break;
        case event.httpMethod === 'GET' && event.path === '/v1/nft/buyable':
            user = await verifyTokenLambda(event.headers);
            response = user ? await ActivityController.getBuyable(query.nftId, user.uid) : ReA();
            break;
        case event.httpMethod === 'GET' && event.path === '/v1/nft/sellable':
            user = await verifyTokenLambda(event.headers);
            response = user ? await ActivityController.getSellable(query.nftId, user.uid) : ReA();
            break;
        default:
            response = ReN();
    }
    if (typeof response === 'undefined') {
        response = ReA()
    }
    return response;
}

module.exports.v1routes = v1routes