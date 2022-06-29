const admin = require('firebase-admin')

const service = require('../json/nft-marketplace-serverless-firebase-admin.json')
admin.initializeApp({
    credential: admin.credential.cert(service),
})

const verifyTokenLambda = async (headers) => {
    try {
        var token = headers['x-access-token']
    } catch (error) {
        return false
    }
    try {
        let decodedToken = await admin.auth().verifyIdToken(token)
        return decodedToken
    } catch (error) {
        console.error(error.message)
        return false 
    }
}

const verifyToken = async (req, res, next) => {
    try {
        var token = req.headers['x-access-token']
    } catch (error) {
        return res.status(403)
            .send({ auth: false, message: 'No token provided.' })
    }
    try {
        let decodedToken = await admin.auth().verifyIdToken(token)
        req.user = decodedToken
        next()
        return null
    } catch (error) {
        console.error(error.message)
        return res.status(403)
            .send({ auth: false, message: 'Failed to authenticate token.' })

    }
}

module.exports = {
    verifyTokenLambda,
    verifyToken
}