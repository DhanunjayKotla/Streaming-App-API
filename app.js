const express = require('express');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const admin = require('firebase-admin');
const multer = require('multer');
const firebase = require("firebase/app")
const firebasestorage = require("firebase/storage");
const cors = require("cors");
const config = require("./firebaseconfig")
const serviceAccount = require('./fb.json');
const User = require('./models/usermodel');
const Video = require('./models/videomodel');
const ffmpeg = require("fluent-ffmpeg");

const app = express();

app.use(cors({
    origin: ["http://localhost:5173"],
    credentials: true,
}));
app.use(cookieParser());
app.use(express.json());

firebase.initializeApp(config);
const storage = firebasestorage.getStorage();
const st = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, '')
    },
    filename: (req, file, cb) => {
        cb(null, 'video.mp4');
    }
})
const upload = multer({ storage: st }).single('Image');
// const upload = multer({ storage: multer.memoryStorage() }).single('Image');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'gs://instagram-e280e.appspot.com',
});

const bucket = admin.storage().bucket();

app.get('/videos', (req, res) => {
    Video.find().populate('uploadedBy')
        .then(data => res.send(data))
        .catch(err => console.log(err.message));
})

app.get('/video/:path(*)', (req, res) => {
    Video.findOneAndUpdate({ path: req.params.path }, { $inc: { views: 0.5 } }, { new: true })
        .populate('uploadedBy').then(data => res.send(data))
        .catch(err => console.log(err.message))
})

app.get('/playvideo/:path(*)', (req, res) => {

    try {
        // console.log(req.cookies.mycat);
        const videoFile = bucket.file(req.params.path);

        // Set the proper headers for streaming
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Accept-Ranges', 'bytes');

        // Stream the video from Firebase Storage to the response
        const readStream = videoFile.createReadStream();
        readStream.pipe(res);
    } catch (err) { console.log(err.message) }
})

app.get('/user/:channelname', (req, res) => {
    User.find({ channelname: req.params.channelname })
        .then(data => {
            res.send(data);
        })
        .catch(err => console.log(err.message))
})

app.post('/user', (req, res) => {
    User.create({
        channelname: req.body.cn,
        password: req.body.pw
    }).then(data => res.send(data))
        .catch(err => err.message)
})

app.post('/upload', (req, res) => {

    upload(req, res, async function (err) {
        if (err instanceof multer.MulterError) {
            console.log(err.message);
        } else if (err) {
            console.log(err.message);
        } else {
            try {

                ffmpeg(req.file.path)
                    .seekInput('00:00:02')
                    .frames(1)
                    .output("thumbnail.png")
                    .run()

                const dateTime = giveCurrentDateTime();
                var videofilepath = `youtube/${req.file.originalname + " " + dateTime}`;
                var buffer = fs.readFileSync('video.mp4');
                var storageRef = firebasestorage.ref(storage, videofilepath);
                await firebasestorage.uploadBytesResumable(storageRef, buffer, { contentType: req.file.mimetype });

                buffer = fs.readFileSync('thumbnail.png');
                var thumbnailfilepath = `youtube/${req.file.originalname + " " + dateTime}-thumbail`;
                var storageRef = firebasestorage.ref(storage, thumbnailfilepath);
                var snapshot = await firebasestorage.uploadBytesResumable(storageRef, buffer, { contentType: 'image/png' });
                var downloadURL = await firebasestorage.getDownloadURL(snapshot.ref);

                Video.create({
                    path: videofilepath,
                    thumbnail: downloadURL,
                    uploadedBy: JSON.parse(req.cookies.mycat)._id,
                    title: req.body.title
                })
                    .then(data => { })
                    .catch(err => console.log(err.message));

                res.status(200).send('success')
            } catch (err) {
                console.log(err.message)
            }
        }
    })
})

app.put('/user', (req, res) => {

    upload(req, res, async function (err) {
        if (err instanceof multer.MulterError) {
            console.log(err.message);
        } else if (err) {
            console.log(err.message);
        } else {
            var profpic = req.cookies.mycat.profilepic;
            try {
                const dateTime = giveCurrentDateTime();
                const storageRef = firebasestorage.ref(storage, `youtube/${req.file.originalname + " " + dateTime}`);
                const metadata = {
                    contentType: req.file.mimetype,
                };
                const snapshot = await firebasestorage.uploadBytesResumable(storageRef, req.file.buffer, metadata);
                const downloadURL = await firebasestorage.getDownloadURL(snapshot.ref);
                var user = await User.findByIdAndUpdate(req.cookies.mycat._id, { profilepic: downloadURL }, { new: true });
                if (!profpic) {
                    const desertRef = firebasestorage.ref(storage, profpic);
                    await firebasestorage.deleteObject(desertRef)
                }
                res.cookie('mycat', user);
                res.send(user);

            } catch (err) {
                console.log(err)
            }
        }
    })
})

app.put('/updatelikes', async (req, res) => {
    const userid = JSON.parse(req.cookies.mycat)._id;
    var post = await Video.findById(req.body.videoid)
    var isliked = post.likes && post.likes.includes(userid)
    var option = isliked ? '$pull' : '$addToSet';

    Video.findByIdAndUpdate(req.body.videoid, { [option]: { likes: userid } }, { new: true })
        .then(result => {
            res.send(result)
        })
        .catch(error => {
            console.log(error.message);
            res.sendStatus(400);
        })
})

const giveCurrentDateTime = () => {
    const today = new Date();
    const date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
    const time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    const dateTime = date + ' ' + time;
    return dateTime;
}

module.exports = app;