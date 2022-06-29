const {to, ReS, ReE, isNull, isEmpty} = require('../services/global.services')
const Users = require('../models/user.model');
const Configs = require('../models/configs.model');

//firebase sdk
var admin = require("firebase-admin");
var serviceAccount = require("../json/nft-marketplace-serverless-firebase-admin.json");
const CONFIG = require('../configs/global.configs');

const register = async function (body) {

    let err, user, config, page;

    var count = await Users.scan().count().exec();
    count = count.count;

    if (count === 0) {
        page = 1;
        count = 1;
    } else {
        count = count + 1;
        page = ((count - 1) / 10) + 1;
        page = Math.trunc(page);
    }

    var input = {
        page: page,
        id: body.id,
        order: count,
        email: body.email,
        walletSeed: body.seed,
        userName: body.userName,
        walletAddress: body.address,
        walletSeed: body.seed,
        social: body.social || [],
        gender: body.gender || "None",
        lastName: body.lastName || "None",
        imageUrl: body.imageUrl || "None",
        firstName: body.firstName || "None",
    };

    if (isNull(body.id)) {
        return ReE({message: 'Please enter user id', success: false})
    }
    if (isNull(body.userName)) {
        return ReE({message: 'Please enter user name', success: false})
    }
    if (isNull(body.email)) {
        return ReE({message: 'Please enter email address', success: false})
    }
    if (isNull(body.address)) {
        return ReE({message: 'Please enter wallet address', success: false})
    }
    if (isNull(body.seed)) {
        return ReE({message: 'Please enter encrypted wallet seed', success: false})
    }

    if (await verifyWalletAddress(input.walletAddress) === false) {
        return ReE({message: 'Wallet address already taken', success: false})
    }
    if (await verifyUserName(input.userName) === false) {
        return ReE({message: 'User name already taken', success: false})
    }

    [err, user] = await to(Users.create(input));

    if (err) {
        console.log("user::create::error", err);
        return ReE({message: 'User query error', success: false})
    }

    [err, config] = await to(Configs.query("id").eq("user-lastpage").exec());

    if (err) {
        console.log("config::query::error", err);
        return ReE({message: 'Config query error', success: false})
    }

    if (config.length === 0) {

        var input = {
            id: "user-lastpage",
            data: page.toString()
        };

        [err, config] = await to(Configs.create(input));
        if (err) {
            console.log("config::create::error", err);
            return ReE({message: 'Config create error', success: false})
        }
    }
    else {

        config = config[0];

        if (Math.trunc(config.data) !== page) {

            [err, config] = await to(Configs.update(
                {id: "user-lastpage"},
                {data: page.toString()}
            ));

            if (err) {
                console.log("config::update::error", err);
                return ReE({message: 'Config update error', success: false})
            }
        }
    }

    return ReS({success: true, result: user})

}
module.exports.register = register

const resetPassword = async function (user, body) {
    
    if (isNull(body.encSeed)) {
        return ReE({message: 'Please enter encrypted wallet seed', success: false})
    }
    if (isNull(body.password)) {
        return ReE({message: 'Please enter new password', success: false})
    }

    let err, newUser;
    [err, newUser] = await to(Users.query("id").eq(user.uid)
        .and().where("active").eq("true").exec());

    if (err) {
        console.log("user::fetch::error", err);
        return ReE({message: 'Get user error', success: false})
    }
    
    if(user.length === 0){
        return ReE({message: 'No User found', success: false})
    }
    
    var firebase = await admin.auth().updateUser(user.uid,
        {
            password: body.password,
            disabled: false
        })
        .then(function (userRecord) {
            console.log("Successfully updated user", userRecord.toJSON());
        })
        .catch(function (error) {
            console.log("Error updating user:", error);
        });

    [err, newUser] = await to(Users.update({id: user.uid}, 
        {walletSeed: body.encSeed}));

    if (err) {
        console.log("user::update::error", err);
        return ReE({message: 'User update failed', success: false})
    }

    return ReS({success: true, result: newUser})
}
module.exports.resetPassword = resetPassword

const getUser = async function (userId) {

    let err, user;

    if (isNull(userId)) {
        return ReE({message: 'Please enter user id', success: false})
    }

    [err, user] = await to(Users.query("id").eq(userId)
        .and().where("active").eq("true")
        .attributes(CONFIG.userPopulatable).exec());

    if (err) {
        console.log("user::fetch::error", err);
        return ReE({message: 'Get user error', success: false})
    }

    return ReS({success: true, result: user})

}
module.exports.getUser = getUser

const getUserByAddress = async function (address) {

    let err, user;

    if (isNull(address)) {
        return ReE({message: 'Please enter user address', success: false})
    }

    [err, user] = await to(Users.query("active").eq("true")
        .and().where("walletAddress").eq(address)
        .attributes(CONFIG.userPopulatable).exec());

    if (err) {
        console.log("user::fetch::error", err);
        return ReE({message: 'Get user error', success: false})
    }

    return ReS({success: true, result: user})

}
module.exports.getUserByAddress = getUserByAddress

const updateUser = async function (user, body) {

    if (isNull(body) || isEmpty(body)) {
        return ReE({message: 'Enter data to update', success: false})
    }

    let err, newUser;
    [err, newUser] = await to(Users.query("id").eq(user.uid)
        .and().where("active").eq("true").exec());

    if (err) {

        console.log("user::update::error", err);
        return ReE({message: 'User fetch error', success: false})
    }
    if (newUser.length < 1) {

        return ReE({message: 'User not Found', success: false})
    }

    [err, newUser] = await to(Users.update({id: user.uid}, body));

    if (err) {

        console.log("user::update::error", err);
        return ReE({message: 'User update error', success: false})
    }

    return ReS({success: true, result: newUser})

}
module.exports.updateUser = updateUser

const getAllUsers = async function () {

    let err, users;

    [err, users] = await to(Users.query("active").eq("true").using("active-index")
        .attributes(CONFIG.userPopulatable).exec());

    if (err) {
        console.log("users::fetch::error", err);
        return ReE({message: 'Get users error', success: false})
    }

    return ReS({success: true, result: users, totalCount: users.length})
}
module.exports.getAllUsers = getAllUsers

const verifyWalletAddress = async function (address) {
    let err, user

    [err, user] = await to(Users.query("active").eq("true").and()
        .where("walletAddress").eq(address).exec());

    if (err) {

        console.log("address::verify::error", err);
        return false;
    }

    else {
        if (user.length < 1) {
            return true;
        }
        else {
            return false;
        }
    }

}

const verifyUserName = async function (name) {
    let err, user;

    [err, user] = await to(Users.query("active").eq("true").and()
        .where("userName").eq(name).exec());

    if (err) {

        console.log("address::verify::error", err);
        return false;
    }

    else {
        if (user.length < 1) {
            return true;
        }
        else {
            return false;
        }
    }

}