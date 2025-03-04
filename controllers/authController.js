/* eslint-disable arrow-body-style */
const { promisify } = require('util');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
// const sendEmail = require('../utils/email');
const Email = require('../utils/email');

// eslint-disable-next-line arrow-body-style
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createAndSendToken = (user, statusCode, res) => {
  // Generate authentication token
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    ),

    /* Browser will not be able to modify this cookie in any way, it can only receive, store and send it to the server automatically with every request.
    This prevents cross-site scripting attacks */
    httpOnly: true,
  };

  if (process.env.NODE_ENV === 'production') {
    // In production, Send the cookie over encrypted connection only (https)
    cookieOptions.secure = true;
  }

  // Sending Cookie
  res.cookie('jwt', token, cookieOptions);

  // Remove password from response
  user.password = undefined;
  user.active = undefined;

  // Sending token
  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  //   const newUser = await User.create(req.body);
  // Don't use the whole req.body as someone might add the admin value in the body and gain administrative access of the website. So select the properties manually
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
  });

  const url = `${req.protocol}://${req.hostname}:${req.socket.localPort}/me`;
  console.log(url);
  await new Email(newUser, url).sendWelcome();

  createAndSendToken(newUser, 201, res);

  /* // Generate authentication token
  const token = signToken(newUser._id);

  // Sending token in sign-up response so that user is automatically logged in
  res.status(201).json({
    status: 'success',
    token,
    data: {
      user: userWithoutPassword,
    },
  }); */
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  // 2) Check if user exists and password is correct
  /* We are using select here to select the password field as we have not selected it by default in our
  userSchema, Video 130: Logging in Users, 12:00
  */
  const user = await User.findOne({ email }).select('+password');
  console.log(user);

  // We are not checking separately for email and password here because in case some attacker is trying to access using random data, he will not know whether the email or password is incorrect
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Invalid email or password', 401));
  }

  // 3) If everything is ok, send token to the client
  createAndSendToken(user, 200, res);

  /* const token = signToken(user._id);
  res.status(200).json({
    status: 'success',
    token,
  }); */
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expiresIn: new Date(Date.now()) + 10 * 1000,
    httpOnly: true,
  });

  res.status(200).json({ status: 'success' });
};

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check if it exists
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
    // console.log(token);
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError('You are not logged in. Please log in to get access', 401),
    );
  }

  // 2) Verify token
  // The verify function returns the payload of the token if the signature is correct and token is not expired
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  // console.log(decoded);

  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError('The user belonging to this token does not exist', 401),
    );
  }

  // 4) Check if user changed the password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password. Please login again', 401),
    );
  }

  // GRANT ACCESS TO PROTECTED ROUTE BY CALLING THE NEXT MIDDLEWARE IN THE STACK
  req.user = currentUser; // Put the current user data on the request object

  // Pug template has access to res.locals and we can put any data inside it
  res.locals.user = currentUser;
  next();
});

// For Rendering Pages
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      // 1) Verify token
      // The verify function returns the payload of the token if the signature is correct and token is not expired
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET,
      );
      // console.log(decoded);

      // 2) Check if user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // 3) Check if user changed the password after the token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }
      // Pug template has access to res.locals and we can put any data inside it
      res.locals.user = currentUser;

      return next();
    } catch (error) {
      return next();
    }
  }
  next();
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles: ['admin', 'lead-guide']
    // Check if the current user role is present in the roles array
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403),
      );
    }

    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on received email from req.body
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('No user found with this email address', 404));
  }

  // 2) Generate the randome reset token
  const resetToken = user.createPasswordResetToken();

  /* - We have to save the document here because we created new fields in the createPasswordResetToken() and now we need to save them in our database
  - This option will deactivate all the validators that we defined in our schema
  - We need to deactivate the validators otherwise we will get validation error */

  await user.save({ validateBeforeSave: false });

  // 3) Send it to user's email

  // const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}\n.If you didn't forgot your password, please ignore this email.`;

  try {
    const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/reset-password/${resetToken}`;
    /* await sendEmail({
      email: user.email,
      subject: 'Your password reset token. (Valid for 10 min)',
      message,
    }); */

    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (err) {
    // Remove reset token from the db
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save({ validateBeforeSave: false });

    return next(new AppError(`${err}`), 500);
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // 2) If token has not expired and there is user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;

  // Delete these fields from db for the user
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();

  // 3) Update changedPasswordAt property for the user (This part is implemented in the pre save hook in userModel)

  // 4) Log the user in, send JWT
  createAndSendToken(user, 200, res);
  /* const token = signToken(user._id);

  res.status(200).json({
    status: 'success',
    token,
  }); */
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  /* Note:
    We cannot use findByIdAndUpdate() here because 
    1. The validators that we defined in the userSchema will not run
    2. The document middlewares which encrypts the password on save (pre save hook) and the one which updates the passwordChangedAt field will not run because these middlewares only run for save() or create() function.
  */

  // 1) Get the user from the collection
  const user = await User.findById(req.user._id).select('+password');

  // 2) Check if POSTed current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Incorrect password. Please try again', 401));
  }

  // 3) If current password is correct, update the password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;

  await user.save();

  // 4) Log the user in, send JWT
  createAndSendToken(user, 200, res);
  /* const token = signToken(user._id);

  res.status(200).json({
    status: 'success',
    token,
  }); */
});
