// const catchAsync = require('../utils/catchAsync');
const Review = require('../models/reviewModel');
const factory = require('./handlerFactory');

// Get All Reviews
/* exports.getAllReviews = catchAsync(async (req, res, next) => {
  let filter = {};

  // If request is coming from a nested route then only show reviews of that particular tour
  if (req.params.tourId) {
    filter = { tour: req.params.tourId };
  }

  const reviews = await Review.find(filter);

  res.status(200).json({
    status: 'success',
    results: reviews.length,
    data: {
      reviews,
    },
  });
}); */

// Middleware to set the Tour and User ID's
exports.setTourAndUserIDs = (req, res, next) => {
  // We can access the req.params.tourId here because we set the mergeParams option to true in the reviewRoutes
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user._id;

  next();
};

// Create New Review
/* exports.createReview = catchAsync(async (req, res, next) => {
  const newReview = await Review.create(req.body);
  
  res.status(201).json({
    status: 'success',
    data: {
      review: newReview,
      },
      });
      }); */

exports.getAllReviews = factory.getAll(Review);

exports.getReview = factory.getOne(Review);

exports.createReview = factory.createOne(Review);

exports.updateReview = factory.updateOne(Review);

exports.deleteReview = factory.deleteOne(Review);
