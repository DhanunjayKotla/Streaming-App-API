const mongoose = require('mongoose')

const videoSchema = new mongoose.Schema({
    path: String,
    thumbnail: String,
    title: String,
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users"
    },
    likes: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: "users"
    },
    views: {
        type: Number,
        default: 0
    }
}, { timestamps: true })
const Video = mongoose.model('videos', videoSchema);

module.exports = Video;