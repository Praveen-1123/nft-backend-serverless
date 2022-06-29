const dynamoose = require("dynamoose");
const Schema = dynamoose.Schema;
const Users = require("./user.model")
const Feed = require("./feeds.model")

const CommentsSchema = new Schema({
    id: {
        type: String,
        required: true,
        hashKey: true,
    },
    feedId: {
        type: Feed,
        index: {
            global: true,
            name: "feed-index"
        },
        required: true
    },
    userId: {
        type: Users,
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
    comment: {
        type: String,
        required: true
    },
}, {timestamps: true});

const Comments = module.exports = dynamoose.model('feed-comments', CommentsSchema);