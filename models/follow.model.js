const dynamoose = require("dynamoose");
const Schema = dynamoose.Schema;
const Users = require("./user.model")

const FollowSchema = new Schema({
    id: {
        type: String,
        required: true,
        hashKey: true,
    },
    userId: {
        type: Users,
        index: {
            global: true,
            name: "user-index"
        },
        required: true
    },
    followId: {
        type: Users,
        index: {
            global: true,
            name: "follow-index"
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
    message: {
        type: String
    },
}, {timestamps: true});

const Follows = module.exports = dynamoose.model('follows', FollowSchema);