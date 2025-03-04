/* eslint-disable prefer-arrow-callback */
/* eslint-disable import/no-extraneous-dependencies */
const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator');
const User = require('./userModel');

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      // Built-in String Validators
      maxlength: [
        40,
        'A tour name must have less than or equal to 40 characters',
      ],
      minlength: [10, 'A tour name must have atleast 10 characters'],
      // Custom Validator
      // validate: [validator.isAlpha, 'Tour name should only contain characters'],
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'], // This is just a short way to pass the value and error message
      // enum validator is only for strings
      enum: [
        {
          values: ['easy', 'medium', 'difficult'],
          message: 'Diffculty is either: easy, medium, hard',
        },
      ],
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      // Number Validators
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be less than or equal to 5.0'],
      // The setter function runs each time we change the value for this field, and it receives the value as an argument
      set: (val) => Math.round(val * 10) / 10,
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
      type: Number,
      // Custom Validator function, here 'this' keyword points to the currently processing document, function returns true if validation is successfull otherwise false
      validate: {
        // Mongoose replaces {VALUE} with the value being validated
        message: 'Discount price ({VALUE}) should be less than regular price',
        validator: function (val) {
          // 'this' only points to the current document on new document creation. It will not work in case we are updating a document
          return val < this.price;
        },
      },
    },
    summary: {
      type: String,
      trim: true, // Removes whitespace from start and end of string
      required: [true, 'A tour must have a summary'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image'],
      // select: false // Doing this will exclude this field from the response we sent to client
    },
    images: [String],
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      // GeoJSON
      /* 
        To specify GeoJSON data, use an embedded document with:
          - A field named 'type' that specifies the GeoJSON object type, and
          - A field named 'coordinates' that specifies the object's coordinates.
          - Each of these fields then get their own schemaType options
      */
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number],
      address: String,
      description: String,
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    // guides: Array,
    guides: [
      {
        type: mongoose.Schema.ObjectId, // This type is used for storing mongoDB ID
        ref: 'User', // Creating a reference to User Model
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true }, // This will include the virtual properties in the json result
    toObject: { virtuals: true },
  },
);

// Indexes
/*
  - MongoDB uses B-Tree data structure for storing the indexes.
  - Indexes are used for improving the read performance.
  - Indexes should only be created for the most queried fields.
  - Indexes take up a lot of storage
  - Each index needs to be updated each time the underlying collection is updated
*/
// Single field index
// tourSchema.index({ price: 1 }); // 1 for Ascending Order and -1 for Descending Order
tourSchema.index({ slug: 1 });

// Compound field index
tourSchema.index({ price: 1, ratingsAverage: -1 });

// Geospatial Index
// 2dsphere is used when the data describes real points on an earth like sphere
tourSchema.index({ startLocation: '2dsphere' });

// Virtual Properties
// We are using a regular function here inside the get() method because we need the 'this' keyword which will be pointing to the current document in this case
tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});

// Virtual Populate
/* Explanation 
  - We are doing parent referencing for the reviews, so we know each review belongs to which tour but this way the tour won't know about all of its reviews.
  - One solution for this is child referencing the reviews in tour model but then the reviews array can grow indefinitely as there can be multiple reviews for one tour.
  - So that's why we are virtually populating the reviews in the tour model.
  - Here, we are keeping a reference of all the child documents (reviews) on the parent document (tour) but we are not storing it in the database as we are doing it virtually.
*/
tourSchema.virtual('reviews', {
  ref: 'Review', // Model to Reference
  foreignField: 'tour', // Field in Review Model that stores the reference
  localField: '_id', // Field in Tour Model
});

// DOCUMENT MIDDLEWARE: This one runs before the .save() and .create() method
// pre() runs before the event has happened
// Here, the 'this' keyword refers to the currently being saved document
// This is called a pre save hook
tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true }); // Creating slug for the tour document
  next(); // calling the next middleware in the middleware stack
});

/* // Document Middleware to get all users data based on IDs (EMBEDDING USER DATA IN TOURS)
tourSchema.pre('save', async function (next) {
  const guidesPromises = this.guides.map(async (id) => await User.findById(id));

  this.guides = await Promise.all(guidesPromises);

  next();
}); */

/* tourSchema.pre('save', function (next) {
  console.log('Pre Middleware saving document...');
  next();
});

// post() Document Middleware, it runs after the event has happened
tourSchema.post('save', function (doc, next) {
  console.log(doc); // It has access to the saved document
  next();
}); */

// QUERY MIDDLEWARE: This one will run before the find query is executed
// This is called a pre find hook, it will run before the query is executed
// Using regular expression, this will now run for all the methods that start with find, ex- findById, findOne, etc.
tourSchema.pre(/^find/, function (next) {
  // tourSchema.pre('find', function (next) {
  // Here, 'this' refers to a query object
  this.find({ secretTour: { $ne: true } });
  this.start = Date.now(); // We can define custom properties on the query object

  next();
});

// POPULATING USER DATA IN TOURS
tourSchema.pre(/^find/, function (next) {
  // The populate() method in Mongoose is used to automatically replace a field in a document with the actual data from a related document. Here we are populating the guides field with the referenced users
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt',
  });

  next();
});

// post find hook, it will run after the query is executed and has access to all the returned documents
/* tourSchema.post(/^find/, function (docs, next) {
  console.log(`Query took ${Date.now() - this.start} milliseconds`);
  next();
}); */

// AGGREGATION MIDDLEWARE: Runs before or after the aggregation is executed
// pre() for before and post() for after
// Here, 'this' object points to the current aggregation object
/* tourSchema.pre('aggregate', function (next) {
  // Adding match stage in the beginning of the pipeline array to filter out all secret tours from the documents
  this.pipeline().unshift({
    $match: { secretTour: { $ne: true } },
  });

  console.log(this.pipeline());
  next();
}); */

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
