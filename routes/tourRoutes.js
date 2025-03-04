const express = require('express');
const {
  getAllTours,
  createTour,
  getTour,
  updateTour,
  deleteTour,
  aliasTopTours,
  getTourStats,
  getMonthlyPlan,
  getToursWithin,
  getDistances,
  resizeTourImages,
  uploadTourImages,
} = require('../controllers/tourController');

const authController = require('../controllers/authController');
// const reviewController = require('../controllers/reviewController');
const reviewRouter = require('./reviewRoutes');

const router = express.Router();

// Nested Route POST /tours/3feid/reviews/ || GET /tours/3feid/reviews/
/* router
  .route('/:tourId/reviews')
  .post(
    authController.protect,
    authController.restrictTo('user'),
    reviewController.createReview,
  ); */

// Redirecting to the reviewRouter in case the route matches
router.use('/:tourId/reviews', reviewRouter);

// Param Middleware - This will only run when a specific parameter is present in the path
// router.param('id', checkID);

router.route('/top-5-cheap').get(aliasTopTours, getAllTours);

router
  .route('/monthly-plan/:year')
  .get(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide', 'guide'),
    getMonthlyPlan,
  );

router.route('/tour-stats').get(getTourStats);

// To get Tours within a particular distance from your location
// Ex- Get all tours within 300 km radius of Los Angeles
router
  .route('/tours-within/:distance/center/:latlng/unit/:unit')
  .get(getToursWithin);

// To Calculate the distance of all tours from a certain point
router.route('/distances/:latlng/unit/:unit').get(getDistances);

router
  .route('/')
  .get(getAllTours)
  .post(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    createTour,
  );

router
  .route('/:id')
  .get(getTour)
  .patch(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    uploadTourImages,
    resizeTourImages,
    updateTour,
  )
  .delete(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    deleteTour,
  );

module.exports = router;
