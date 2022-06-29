const dynamoose = require("dynamoose");
const Schema = dynamoose.Schema;
const Users = require("./user.model")
const NFT = require("./nft.model")

const ActivitySchema = new Schema({
    id: {
        type: String,
        required: true,
        hashKey: true,
    },
    active: {
        type:String,
        index: {
            global: true,
            name: "active-index"
          },
        default:"true"
    },
    status: {
        type: String,
        index: {
            global: true,
            name: "status-index"
        },
        enum: ['SUBMITTED', 'FAILED', 'MINTED', 'ONSALE', 'BOUGHT', 'BURNT', 'TRANSFERD', 'PRICEUPDATED', 'SOLD'],
        default: 'SUBMITTED'
    },
    nftId: {
        type: NFT,
        index: {
            global: true,
            name: "nft-index"
        }
    },
    userId: Users,
    amount: {
        type: Number,
        required: true
    },
    assetType: {
        type: String,
        required: true
    },
    tokenId: {
        type: Number,
        required: true
    },
    tokenPrice: {
        type: Number
    },
    itemId: {
        type: Number,
        default: 0
    },
    txHash: {
        type: String
    }
}, { timestamps: true });

const Activity = module.exports = dynamoose.model('activity', ActivitySchema);