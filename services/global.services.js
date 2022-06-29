module.exports.to = function (promise) {
    return promise
        .then(data => {
            return [null, data];
        }).catch(err =>
            [err]
        );
}

module.exports.ReS = function (body) {
    return {
        statusCode: 200,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": true
        },
        body: JSON.stringify(body)
    }
}

module.exports.ReE = function (body) {
    return {
        statusCode: 400,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": true
        },
        body: JSON.stringify(body)
    }
}

module.exports.ReN = function () {
    return {
        statusCode: 404,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": true
        },
        body: JSON.stringify("404 Not Found")
    }
}

module.exports.ReA = function () {
    return {
        statusCode: 401,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": true
        },
        body: JSON.stringify("Unauthorized")
    }
}

function isNull (field) {
    return typeof field === 'undefined' || field === '' || field === null
}

module.exports.isNull = isNull

function isEmpty(obj) {
    return !Object.keys(obj).length > 0;
}

module.exports.isEmpty = isEmpty
