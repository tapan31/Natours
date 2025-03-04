const multer = require('multer');
const sharp = require('sharp');
const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

// File Upload using Multer
/* const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // First argument of this callback is an error, if there is no error then we pass null here
    cb(null, 'public/img/users');
  },
  filename: (req, file, cb) => {
    const ext = file.mimetype.split('/')[1];
    cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
  },
}); */

// Storing image in memory as a buffer
const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  // Checking if the file we are trying to upload is an image or not
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image. Please upload only images', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  // Adding the filename in req.file so that we can then use it to store in the database in updateMe controller
  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

  // Resizing the photo and storing it
  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`);

  next();
});

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};

  Object.keys(obj).forEach((field) => {
    if (allowedFields.includes(field)) {
      newObj[field] = obj[field];
    }
  });

  return newObj;
};

// User Route Handlers
/* exports.getAllUsers = catchAsync(async (req, res, next) => {
  const users = await User.find();
  res.status(200).json({
    status: 'success',
    data: {
      results: users.length,
      users,
    },
  });
}); */

exports.getMe = (req, res, next) => {
  // req.params.id = req.user._id;
  // Mongoose automatically adds a virtual getter for the _id field called id, which converts the ObjectId to a string. So that's why we can use req.user.id instead of req.user._id

  req.params.id = req.user.id;

  next();
};

// Updates the currently logged in user data
exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) Create Error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /update-password route',
        400,
      ),
    );
  }

  // 2) Filter out unwanted fields that are not allowed to be updated
  const filteredBody = filterObj(req.body, 'name', 'email');

  // We only store the filename of the image in db
  if (req.file) {
    filteredBody.photo = req.file.filename;
  }

  // 3) Update the user document
  const updatedUser = await User.findByIdAndUpdate(req.user._id, filteredBody, {
    new: true,
    runValidators: true,
  });

  // console.log(req.file);
  // console.log(req.body);

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

// Delete the currently logged in user
exports.deleteMe = catchAsync(async (req, res, next) => {
  // We do not actually delete the user from database, instead we create an active flag in our database and set it to false, to mark the user as inactive

  await User.findByIdAndUpdate(req.user._id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not defined, use /signup instead',
  });
};

exports.getAllUsers = factory.getAll(User);

exports.getUser = factory.getOne(User);

// Do not update password with this because the pre save hooks will not run for findByIdAndUpdate
exports.updateUser = factory.updateOne(User);

/* exports.deleteUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not yet implemented',
  });
};
 */

exports.deleteUser = factory.deleteOne(User);
