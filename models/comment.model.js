const dynamoose = require("dynamoose");
const Schema = dynamoose.Schema;
const Users = require("./user.model")
const NFT = require("./nft.model")

const CommentsSchema = new Schema({
    id: {
        type: String,
        required: true,
        hashKey: true,
    },
    nftId: {
        type: NFT,
        index: {
            global: true,
            name: "nft-index"
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

const Comments = module.exports = dynamoose.model('nft-comments', CommentsSchema);