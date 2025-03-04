const Tour = require('../models/tourModel');
// const APIFeatures = require('../utils/apiFeatures');
const multer = require('multer');
const sharp = require('sharp');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

// This is a param middleware, it takes a 4th argument which contains the value of the parameter for which the middleware runs
/* exports.checkID = (req, res, next, val) => {
  if (req.params.id > tours.length) {
    return res.status(404).json({
      status: 'fail',
      message: 'Invalid ID',
    });
  }

  next();
}; */

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

// Used when getting images from multiple Form fields
exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 },
]);

// This is used when we are getting multiple files from a single form field
// upload.array('images', 3) // req.files

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  // console.log(req.files);

  if (!req.files.imageCover || !req.files.images) return next();

  // Adding the filename to req.body here because we are directly passing the req.body in the updateOne handler
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}.jpeg`;

  // 1) Image Cover
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`);

  // 2) Images
  req.body.images = [];

  /* Explanation
    - The map function with async callbacks creates an array of promises (one for each image processing operation). Promise.all waits for all these promises to resolve.
    - Waiting for Completion: Promise.all takes an array of promises and returns a single promise that resolves when all of the promises in the array have resolved.
    - Promise.all lets you process all images concurrently rather than sequentially. This is much more efficient - if you have 5 images, they'll all start processing at once rather than waiting for each one to finish before starting the next.
  */
  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;

      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${filename}`);

      req.body.images.push(filename);
    }),
  );

  next();
});

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';

  next();
};

// Old Get Tours
// exports.getAllTours = async (req, res) => {
//   try {
//     console.log('Request Query: ', req.query);

//     // Build the query
//     // 1A) Filtering
//     // const queryObj = { ...req.query };
//     // const excludedFields = ['page', 'sort', 'limit', 'fields'];
//     // excludedFields.forEach((el) => delete queryObj[el]);

//     /* Querying using mongoose built-in functions
//     // The find() method returns a query and that's why we can chain other methods on it
//     const query = Tour.find()
//       .where('duration')
//       .equals(5)
//       .where('difficulty')
//       .equals('easy'); */

//     /* 1B) Advanced Filtering
//       gt, gte, lt, lte
//       { duration: { gte: '5' }, difficulty: 'easy' }
//       Tour.find({duration: {$gte: 5}, difficulty: 'easy'})
//     */
//     // let queryStr = JSON.stringify(queryObj);
//     // // This will replace gte, gt, lt, lte in the query with $gte, $gt, $lt, $lte
//     // queryStr = queryStr.replace(/\b(gte|gt|lt|lte)\b/g, (match) => `$${match}`);
//     // console.log('Query String: ', JSON.parse(queryStr));

//     // let query = Tour.find(JSON.parse(queryStr));

//     // 2) Sorting
//     /* if (req.query.sort) {
//       // This will give us the sorting fields as a space separated string
//       const sortBy = req.query.sort.split(',').join(' ');
//       console.log(sortBy);
//       query = query.sort(sortBy);
//       // sort('price ratingsAverage') // Sorting by multiple fields
//     } else {
//       // Default Sort: In case there is no sorting query specified in the url, we will sort the tours by createdAt in descending order
//       query = query.sort('-createdAt');
//     } */

//     // 3) Field Limiting - Selecting only specific fields from the document
//     /* if (req.query.fields) {
//       const fields = req.query.fields.split(',').join(' ');
//       query = query.select(fields); // Projection
//     } else {
//       query = query.select('-__v'); // Use - before a field to exclude it from the response
//     } */

//     // 4) Pagination
//     /* const page = req.query.page * 1 || 1;
//     const limit = req.query.limit * 1 || 10;
//     const skip = (page - 1) * limit;

//     query = query.skip(skip).limit(limit);

//     if (req.query.page) {
//       const numTours = await Tour.countDocuments();
//       // In case we are trying to skip more documents than we actually have
//       if (skip >= numTours) {
//         throw new Error('This page does not exist');
//       }
//     } */

//     // Execute the query, when we use await then the query will execute and return the matched documents
//     const features = new APIFeatures(Tour.find(), req.query)
//       .filter()
//       .sort()
//       .limitFields()
//       .paginate();
//     const tours = await features.query;
//     // const tours = await query

//     res.status(200).json({
//       status: 'success',
//       results: tours.length,
//       data: {
//         tours,
//       },
//     });
//   } catch (err) {
//     res.status(404).json({
//       status: 'fail',
//       message: err.message || err,
//     });
//   }
// };

/* exports.getAllTours = catchAsync(async (req, res, next) => {
  // Execute the query, when we use await then the query will execute and return the matched documents
  const features = new APIFeatures(Tour.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();
  const tours = await features.query;

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      tours,
    },
  });
}); */

exports.getAllTours = factory.getAll(Tour);

/* exports.getTour = catchAsync(async (req, res, next) => {
  // req.params gives access to all parameter variables defined in the path, Ex - tours/:id, here id is parameter and :x? is an optional parameter (use ? for creating optional parameters, /tours/:id/:x?, here x is an optional paramter, so the path will match even when this parameter is missing)
  // console.log(req.params);

  const tour = await Tour.findOne({ _id: req.params.id }).populate('reviews');

  if (!tour) {
    return next(new AppError('No tour found for the given ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      tour,
    },
  });
}); */

exports.getTour = factory.getOne(Tour, { path: 'reviews' });

exports.createTour = factory.createOne(Tour);

exports.updateTour = factory.updateOne(Tour);

exports.deleteTour = factory.deleteOne(Tour);

exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } },
    },
    {
      $group: {
        _id: { $toUpper: '$difficulty' },
        numTours: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' }, // For specifying the field, we use the dollar sign and then the name of the field
      },
    },
    {
      $sort: { avgPrice: 1 }, // Use 1 for Ascending and -1 for Descending
    },
    // {
    //   $match: { _id: { $ne: 'EASY' } },
    // },
  ]);

  res.status(200).json({
    status: 'success',
    data: { stats },
  });
});

// Calculating monthly number of tours in a given year (From the most busiest month to the least busiest)
// How many tours start in each of the month of the given year
exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1;

  const plan = await Tour.aggregate([
    {
      // unwind stage breaks down the array in separate documents, It will duplicate each document for every element of array
      // So here, we will have one document for each startDate of the startDates array
      $unwind: '$startDates',
    },
    {
      // Filtering tours for a specific year, it will give all the tours which start in the given year
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      // Grouping the tours based on month
      $group: {
        _id: { $month: '$startDates' },
        numTourStarts: { $sum: 1 },
        tours: { $push: '$name' },
      },
    },
    {
      // To add fields in the result
      $addFields: {
        month: '$_id',
      },
    },
    {
      // To include or exclude fields from the result
      $project: {
        _id: 0, // 0 to remove the field, 1 to add the field in result
      },
    },
    {
      $sort: {
        numTourStarts: -1,
      },
    },
    // { $limit: 6 }, // limits the number of documents we get
  ]);

  res.status(200).json({
    status: 'success',
    data: { plan },
  });
});

// /tours-within/:distance/center/:latlng/unit/:unit
// /tours-within/233/center/23.2983,34.892/unit/mi
exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  // Converting distance in radian unit by dividing it by the radius of Earth
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  if (!lat || !lng) {
    return next(
      new AppError(
        'Please provide latitude and longitude in the format: lat,lng',
        400,
      ),
    );
  }

  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours,
    },
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  if (!lat || !lng) {
    return next(
      new AppError(
        'Please provide latitude and longitude in the format: lat,lng',
        400,
      ),
    );
  }

  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  // Geospatial Aggregation
  const distances = await Tour.aggregate([
    /* $geoNear outputs documents in order of nearest to farthest from a specified point. 
      - It always needs to be the first stage of the pipeline.
      - It requires a geospatial index.
    */
    {
      $geoNear: {
        // The point from which to find the closest documents, it is defined as GeoJSON
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1],
        },
        distanceField: 'distance', // Name of the field where all the calculated distances will be stored
        distanceMultiplier: multiplier, // The factor to multiply all distances returned by the query
      },
    },
    {
      $project: {
        name: 1,
        distance: 1,
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      data: distances,
    },
  });
});
