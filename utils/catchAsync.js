/* eslint-disable arrow-body-style */

// This function catches asynchronous errors
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
    // fn(req, res, next).catch(err => next(err)); // Both are same
  };
};

module.exports = catchAsync;
