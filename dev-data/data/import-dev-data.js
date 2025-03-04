/* eslint-disable no-unused-vars */
/* eslint-disable import/no-extraneous-dependencies */
const dotenv = require('dotenv').config({ path: './config.env' });
const mongoose = require('mongoose');
const fs = require('fs');
const Tour = require('../../models/tourModel');
const User = require('../../models/userModel');
const Review = require('../../models/reviewModel');

// We need to connect with the database here because this script runs independently from the rest of the express application
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('Database Connected'))
  .catch((err) => console.log('Connection to database failed', err));

// Read JSON File
const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`, 'utf-8'));
const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`, 'utf-8'));
const reviews = JSON.parse(
  fs.readFileSync(`${__dirname}/reviews.json`, 'utf-8'),
);

// Import Data into DB
const importData = async () => {
  try {
    await Tour.create(tours);
    await User.create(users, { validateBeforeSave: false });
    await Review.create(reviews);
    console.log('Data successfully loaded');
  } catch (err) {
    console.log(err);
  } finally {
    process.exit();
  }
};

// Delete Data from DB
const deleteData = async () => {
  try {
    await Tour.deleteMany();
    await User.deleteMany();
    await Review.deleteMany();
    console.log('Data deleted successfully');
  } catch (err) {
    console.log(err);
  } finally {
    process.exit();
  }
};

/* 
    process.argv gives us the command line arguments that we pass while running the script in terminal
    Ex - node ./dev-data/data/import-dev-data.js --import, here --import is the argument we are passing and then it will be available to us in process.argv
*/
if (process.argv[2] === '--import') {
  importData();
} else if (process.argv[2] === '--delete') {
  deleteData();
}
