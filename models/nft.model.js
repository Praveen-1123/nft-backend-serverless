const dynamoose = require("dynamoose");
const Schema = dynamoose.Schema;
const Users = require("./user.model")

const NftSchema = new Schema({
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
    status: {
        type: String,
        index: {
            global: true,
            name: "status-index"
        },
        enum: ['PENDING', 'MINTED', 'ONSALE', 'FAILED'],
        default: "PENDING"
    },
    userId: Users,
    creatorId: {
        type: String
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    attachments: {
        type: Array,
        schema: [{
            type: Object,
            schema: {
                fileType: {
                    type: String
                },
                url: {
                    type: String
                },
            }
        }]
    },
    category: {
        type: String,
        default: "Common"
    },
    likes: {
        type: Number,
        default: 0
    },
    comments: {
        type: Number,
        default: 0
    },
    tokenPrice: {
        type: Number,
        default: 0
    },
    totalSupply: {
        type: Number,
        default: 0
    },
    stockAvailable: {
        type: Number,
        default: 0
    },
    tokenId: {
        type: Number,
        required: true
    },
    chainName: {
        type: String,
        required: true
    },
    assetType: {
        type: String,
        required: true
    },
    marketAddress: {
        type: String,
        required: true
    },
    nftAddress: {
        type: String,
        required: true
    },
    txHash: {
        type: String,
    },
    metadata: {
        type: String,
    },
    royalty: {
        type: Number,
        default: 5
    },
    order: {
        type: Number,
        default: 0
    },
    page: {
        type: Number,
        default: 0
    },
}, {
    timestamps: true
});

const NFT = module.exports = dynamoose.model('nft', NftSchema);