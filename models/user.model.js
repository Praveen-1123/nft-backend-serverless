const dynamoose = require("dynamoose");
const Schema = dynamoose.Schema;

const UsersSchema = new Schema({
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
    userName: {
        type: String,
        required: true,
        index: {
            global: true,
            name: "userName-index"
        },
    },
    imageUrl: {
        type: String
    },
    firstName: {
        type: String
    },
    lastName: {
        type: String
    },
    gender: {
        type: String,
        default: "None"
    },
    email: {
        type: String,
        required: true
    },
    dateOfBirth: {
        type: String
    },
    profession: {
        type: String,
        default: "None"
    },
    about: {
        type: String,
        default: "None"
    },
    emailVerified: {
        type: Boolean,
        default: false
    },
    followers: {
        type: Number,
        default: 0
    },
    followings: {
        type: Number,
        default: 0
    },
    private: {
        type: Boolean,
        default: false
    },
    walletSeed: {
        type: String,
        required: true
    },
    walletAddress: {
        type: String,
        required: true
    },
    social: {
        type: Array,
        schema: [{
            type: Object,
            schema: {
                type: {
                    type: String
                },
                userName: {
                    type: String
                },
            }
        }]
    },
    order: {
        type: Number,
        default: 0
    },
    page: {
        type: Number,
        default: 0
    },
},
    {
        timestamps: true
    });

const Users = module.exports = dynamoose.model('users', UsersSchema);