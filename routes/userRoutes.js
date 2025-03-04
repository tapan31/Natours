const express = require('express');
const userController = require('../controllers/userController');
const multer = require('multer');

const authController = require('../controllers/authController');

const router = express.Router();

/* Note 
  Images are not stored directly in our database. We upload them in our file system and then store the image link in the database.
  We create this upload object to define some options and then we use it to create a middleware that we can add to the middleware stack of any route.
*/
const upload = multer({ dest: 'public/img/users' });

/* This is a special route that does not follow the REST Philosophy of naming routes, where the name of the URL has nothing to do with the action that is actually performed
 */
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

router.post('/forgot-password', authController.forgotPassword);
router.patch('/reset-password/:token', authController.resetPassword);

// This will protect all the routes after this line, so we don't have to explicitly add the protect middleware on each route, we added it to the router instead
router.use(authController.protect);

// These routes are automatically protected because we have attached the protect middleware to the router itself, so the next middleware will only be called if the user is authenticated
router.patch(
  '/update-password',
  // authController.protect,
  authController.updatePassword,
);

router.get(
  '/me',
  // authController.protect,
  userController.getMe,
  userController.getUser,
);

router.patch(
  '/update-me',
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe,
);

router.delete('/delete-me', userController.deleteMe);

// Restrict these routes to admin only, so all the routes after this middleware can only be accessed by the admin
router.use(authController.restrictTo('admin'));

router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
