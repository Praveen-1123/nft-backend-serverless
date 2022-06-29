const express = require('express')
const logger = require('morgan')
const bodyParser = require('body-parser')
const cors = require('cors')
const pe = require('parse-error')
const AWS = require('aws-sdk');
const CONFIG = require('./configs/global.configs')

AWS.config.update({
    region: CONFIG.region,
    accessKeyId: CONFIG.accessKeyId,
    secretAccessKey: CONFIG.secretAccessKey
});

const app = express()
const PORT = process.env.PORT || 3200

app.use(logger('combined'))
app.use(cors())
app.use(bodyParser.json())

app.get('/', (req, res) => {
    return res.json({
        message: 'Hello! Welcome to NFT Marketplace API.',
    })
})

const v1 = require('./routes/v1')
app.use('/v1', v1)
app.listen(PORT, () => {
    console.log('Server started on port', PORT)
})
