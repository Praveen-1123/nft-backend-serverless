const lambdaLocal = require('lambda-local');
const path = require('path');

var jsonPayload = {
    httpMethod: 'GET',
    path: '/v1/nft',
    queryStringParameters: { nftId: 'nft-id' },
    headers: { 'x-access-token': 'Bearer jwt-token'},
    body: JSON.stringify({
        someKey: 'some-data'
    })
}

lambdaLocal.execute({
    event: jsonPayload,
    lambdaPath: path.join(__dirname, 'index.js'),
    timeoutMs: 100000
}).then(function (done) {
    console.log("Status:", done.statusCode)
    console.log("Response:", JSON.parse(done.body))
}).catch(function (err) {
    console.log("Lambda Error:", err);
});
