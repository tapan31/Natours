/* eslint-disable no-unused-vars */
/* eslint-disable import/no-extraneous-dependencies */
const dotenv = require('dotenv').config({ path: './config.env' });
const mongoose = require('mongoose');

/* Handling Uncaught Exception 
  - All errors that occur in synchronous code but are not handled anywhere are called uncaught exceptions
  - This should be at the top of our file, before we require the app so that we start listening for the uncaughtException immediately before any other code runs
*/
process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION, Shutting down...');
  console.log(err);
  console.log(err.name, err.message);
  process.exit(1);
});

const app = require('./app');

// console.log(app.get('env'));
// console.log(process.env);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('Database Connected'))
  .catch((err) => console.log('Connection to database failed', err));

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log('App running on port ', PORT);
});

/* Handling Unhandled Rejections
  - Each time there is an unhandled rejection somewhere in our application, the process object will emit the 'unhandledRejection' event and then we can attach a listener on it to handle that rejection. 
  - This will globally handle any unhandled Promise Rejection in our application
  - We are listening for the unhandled rejection event which will allow us to handle all unhandled promises in our application
*/
process.on('unhandledRejection', (err) => {
  console.log(err.name, err.message);
  console.log(err);
  console.log('UNHANDLED REJECTION, Shutting Down...');

  // Gracefully Closes the server after the currently running requests are handled (instead of abruptly closing the server) and the server emits a 'close' event
  server.close(() => {
    process.exit(1);
  });
});
