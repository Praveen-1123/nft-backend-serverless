const dynamoose = require("dynamoose");
const Schema = dynamoose.Schema;
const NFT = require("./nft.model")

const LikesSchema = new Schema({
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

const Likes = module.exports = dynamoose.model('nft-likes', LikesSchema);