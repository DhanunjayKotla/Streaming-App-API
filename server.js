const mongoose = require('mongoose')
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });
const app = require('./app');


mongoose
    .connect(process.env.DATABASE_ATLAS)
    .then(() => console.log('Successfully connected to the database!'))
    .catch(err => console.log('Failed to connect to the database! ' + err.message));

app.listen(3000, () => {
    console.log("listening on port 3000");
})