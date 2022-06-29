module.exports.to = function (promise) {
    return promise
        .then(data => {
            return [null, data];
        }).catch(err =>
            [err]
        );
}

module.exports.ReE = function (res, err) { // Error Web Response
    if (typeof err == 'object' && typeof err.message != 'undefined') {
        err = err.message
    }
    
    res.statusCode = 400
    
    return res.json({success: false, error: err})
}

module.exports.ReS = function (res, data, code) { // Success Web Response
    let send_data = {success: true}
    
    if (typeof data == 'object') {
        send_data = Object.assign(data, send_data)//merge the objects
    }
    
    if (typeof code !== 'undefined') res.statusCode = code
    
    return res.json(send_data)
}

function isNull (field) {
    return typeof field === 'undefined' || field === '' || field === null
}

module.exports.isNull = isNull

function isEmpty(obj) {
    return !Object.keys(obj).length > 0;
}

module.exports.isEmpty = isEmpty
