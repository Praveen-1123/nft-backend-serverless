const dynamoose = require("dynamoose");
const Schema = dynamoose.Schema;

const ConfigsSchema = new Schema({
    id: {
        type: String,
        required: true,
        hashKey: true,
    },
    data: {
        type: String,
        required: true
    }
}, { timestamps: true });


const Configs = module.exports = dynamoose.model('configs', ConfigsSchema);