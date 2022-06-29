const dynamoose = require("dynamoose");
const Schema = dynamoose.Schema;
const Feeds = require("./feeds.model")

const LikesSchema = new Schema({
    id: {
        type: String,
        required: true,
        hashKey: true,
    },
    feedId: {
        type: Feeds,
        index: {
            global: true,
            name: "feed-index"
        },
        required: true
    },
    userId: {
        type: String,
        index: {
            global: true,
            name: "user-index"
        },
        required: true
    },
    active: {
        type: String,
        index: {
            global: true,
            name: "active-index"
        },
        default: "true"
    },
    likes: {
        type: Number,
        default: 1
    },
}, {timestamps: true});

const Likes = module.exports = dynamoose.model('feed-likes', LikesSchema);