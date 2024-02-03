const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    channelname: {
        type: String,
        unique: true
    },
    profilepic: {
        type: String
    },
    password: { type: String }
})
const User = mongoose.model('users', userSchema);

module.exports = User;