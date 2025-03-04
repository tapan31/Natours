/* eslint-disable no-param-reassign */

const AppError = require('../utils/appError');

// Creating custom error object for Mongoose CastError
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

// Custom error object for Duplicate Field in MongoDB
const handleDuplicateFieldsDB = (err) => {
  const value = err.errorResponse.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate field value ${value}. Please use another value`;
  return new AppError(message, 400);
};

// Custom error object for Validation Error in Mongoose
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid Input Data: ${errors.join('. ')}`;
  return new AppError(message, 400);
};

// Custom error object for JWT Error
const handleJWTError = () =>
  new AppError('Invalid Token. Please log in again', 401);

// Custom error object for expired token
const handleExpiredTokenError = () =>
  new AppError('Token Expired. Please log in again', 401);

const sendErrorDev = (err, req, res) => {
  // API
  if (req.originalUrl.startsWith('/api')) {
    res.status(err.statusCode).json({
      error: err,
      status: err.status,
      message: err.message,
      stack: err.stack,
    });
  } else {
    // RENDERED WEBSITE
    res.status(err.statusCode).render('error', {
      title: 'Something went wrong!',
      msg: err.message,
    });
  }
};

/* Operational errors are problems that we can predict will happen at some point, so we handle them in advance
   In case the error is not operational, we will send a generic message to client so that we do not leak any information about the error */
const sendErrorProd = (err, req, res) => {
  // API
  if (req.originalUrl.startsWith('/api')) {
    // Operational error, trusted: Send message to the client
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
      // Programming or other unknown error: Don't leak error details
    } else {
      // 1) Log the error
      console.error('ERROR: ', err);

      // 2) Send generic message to the client
      return res.status(500).json({
        status: 'error',
        message: 'Something went wrong!!',
      });
    }
  } else {
    // RENDERED WEBSITE
    // Operational error, trusted: Send message to the client
    if (err.isOperational) {
      return res.status(err.statusCode).render('error', {
        title: 'Something went wrong!',
        msg: err.message,
      });
      // Programming or other unknown error: Don't leak error details
    } else {
      // 1) Log the error
      console.error('ERROR: ', err);

      // 2) Send generic message to the client
      return res.status(err.statusCode).render('error', {
        title: 'Something went wrong!',
        msg: 'Please try again later.',
      });
    }
  }
};

// Error handler middleware
module.exports = (err, req, res, next) => {
  // console.log(err.stack)
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Sending different error messages in production and development environment
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    /* - Error objects in JavaScript have some special properties that are not enumerable by default. These include name, message, and stack.
      - When you use the spread operator {...err}, it only copies enumerable properties. The non-enumerable properties (like name) don't get copied over.
      That's why error.name is undefined because the name property didn't get copied in the error object 
    */
    let error = { ...err };
    error.message = err.message;

    if (err.name === 'CastError') {
      error = handleCastErrorDB(error);
    }
    if (err.code === 11000) {
      error = handleDuplicateFieldsDB(error);
    }
    if (err.name === 'ValidationError') {
      error = handleValidationErrorDB(error);
    }
    if (err.name === 'JsonWebTokenError') {
      error = handleJWTError();
    }
    if (err.name === 'TokenExpiredError') {
      error = handleExpiredTokenError();
    }
    sendErrorProd(error, req, res);
  }
};
