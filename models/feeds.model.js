const dynamoose = require("dynamoose");
const Schema = dynamoose.Schema;
const Users = require("./user.model")

const FeedsSchema = new Schema({
    id: {
        type: String,
        required: true,
        hashKey: true,
    },
    active: {
        type: String,
        index: {
            global: true,
            name: "active-index"
        },
        default: "true"
    },
    feedType: {
        type: String,
        index: {
            global: true,
            name: "feedType-index"
        },
        enum: ["Feed", "Shared", "Asset"],
        default: "Feed"
    },
    attachments: {
        type: Array,
        schema: [{
            type: Object,
            schema: {
                fileType: {type: String},
                url: {type: String},
            }
        }]
    },
    userId: Users,
    title: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    tags: {
        type: Array,
        schema: [String]
    },
    likes: {
        type: Number,
        default: 0
    },
    comments: {
        type: Number,
        default: 0
    },
    reports: {
        type: Number,
        default: 0
    },
    order: {
        type: Number
    },
    page: {
        type: Number
    },
}, {
    timestamps: true,
    saveUnknown: [
        "tags.*",
        "report.*"
    ]
});

const Feeds = module.exports = dynamoose.model('feeds', FeedsSchema);