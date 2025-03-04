const express = require('express');
const reviewController = require('../controllers/reviewController');
const authController = require('../controllers/authController');

const router = express.Router({ mergeParams: true }); // This option allows us to get the parameters from the parent router inside req.params

// GET /tours/3eid83f/reviews
// POST /tours/3eid83f/reviews
// POST /reviews

// Protecting all the routes from this point forward
router.use(authController.protect);

router
  .route('/')
  .get(reviewController.getAllReviews)
  // Only authenticated and regular users can post reviews (not tour guides and admins)
  .post(
    authController.restrictTo('user'),
    reviewController.setTourAndUserIDs,
    reviewController.createReview,
  );

router
  .route('/:id')
  .get(reviewController.getReview)
  .patch(
    authController.restrictTo('user', 'admin'),
    reviewController.updateReview,
  )
  .delete(
    authController.restrictTo('user', 'admin'),
    reviewController.deleteReview,
  );

module.exports = router;
