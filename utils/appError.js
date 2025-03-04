class AppError extends Error {
  constructor(message, statusCode) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${this.statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    /*
    The main use case for Error.captureStackTrace() is to install a stack trace on a custom error object. Typically, you define custom errors by extending the Error class, which automatically makes the stack property available via inheritance. However, the problem with the default stack trace is that it includes the constructor call itself, which leaks implementation details. You can avoid this by using Error.captureStackTrace(), which allows the stack trace to be installed even for custom errors that do not inherit from Error.
    */
    // Avoid AppError itself in the stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
