const AWS = require('aws-sdk');
const CONFIG = require('./configs/global.configs')

AWS.config.update({
    region: CONFIG.region,
    accessKeyId: CONFIG.accessKeyId,
    secretAccessKey: CONFIG.secretAccessKey
});

const {ReS, ReE, isNull, isEmpty} = require('./services/global.services');
const {v1routes} = require('./routes/v1.lambda');

exports.handler = async (event) => {
    let api_version = event.path.split('/');
    api_version = api_version[1];

    if (api_version === 'v1') {
        return v1routes(event);
    }
    else {
        return ReE('Invalid API VERSION - ' + api_version);
    }
};
