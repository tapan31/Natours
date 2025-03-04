// review, rating, createdAt, ref to tour, ref to user
const mongoose = require('mongoose');
const Tour = require('./tourModel');

/* Understanding the Relationship b/w Reviews, Users and Tours
    Review has Many:1 Relationship with Tours and Users
    - A User can write many reviews but each review will belong to a specific user.
    - A Tour can have many reviews but each review will belong to a specific tour.
    - We will implement Parent Referencing here, each review will store the ObjectID of its Tour and User.
    - This way we will know who wrote the review and what tour it belongs to. 
*/

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review cannot be empty'],
    },
    rating: {
      type: Number,
      required: [true, 'A review must have a rating'],
      min: 1,
      max: 5,
    },
    // Implementing Parent Referencing for Tours and Users
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must always belong to a tour'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must always belong to a user'],
    },
  },
  {
    timestamps: true,
    // This will include the virtuals properties in the response
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Unique Compound Index
// We index so that one user cannot write multiple reviews for the same tour
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

// Pre Find Hook: Populating the tour and user field with actual data
reviewSchema.pre(/^find/, function (next) {
  // Here, we are selecting only relevant fields and not the entire document to avoid sending unnecessary information
  /* this.populate({
    path: 'user',
    select: 'name photo',
  }).populate({
    path: 'tour',
    select: 'name',
  }); */

  // We are not populating the tours because its not required for our use case (Video: 157)
  this.populate({
    path: 'user',
    select: 'name photo',
  });

  next();
});

// Static method to calculate average rating
reviewSchema.statics.calcAverageRatings = async function (tourId) {
  // Here, 'this' keyword points to the current model
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);

  if (stats.length > 0) {
    // Update the Tour with the new average rating
    await Tour.findByIdAndUpdate(tourId, {
      ratingsAverage: stats[0].avgRating,
      ratingsQuantity: stats[0].nRating,
    });
  } else {
    // Set to default values if there are no reviews
    await Tour.findByIdAndUpdate(tourId, {
      ratingsAverage: 4.5,
      ratingsQuantity: 0,
    });
  }

  console.log(stats);
};

/* pre find hook
  - This middleware will be called each time the review is updated using the findByIdAndUpdate or deleted using the findByIdAndDelete.
  - Here we are using findOneAnd in the regular expression because these findById methods internally use the findOneAnd methods.
*/
reviewSchema.pre(/^findOneAnd/, async function (next) {
  /* Reason for using clone()
    Mongoose no longer allows executing the same query object twice. If you do, you'll get a Query was already executed error. Executing the same query instance twice is typically indicative of mixing callbacks and promises, but if you need to execute the same query twice, you can call Query#clone() to clone the query and re-execute it.
  */

  // Adding the document as a property in the query object, It is used to pass data from one middleware to another
  this.r = await this.clone().findOne();

  next();
});

reviewSchema.post(/^findOneAnd/, async function () {
  //   this.r = await this.clone().findOne(); // Does not work here, query has already executed
  await this.r.constructor.calcAverageRatings(this.r.tour);
});

/* Note (Video: 168)
  - The middlewares must be defined before the Model Decalration otherwise the schema would not contain that middlware during the model creation as the code is executed sequentially.
  - We have to use post middleware here otherwise while matching the reviews for the tourId in 'match' stage, we will not have access to the current review because it is not saved in the database yet.
  FLOW
  - The calcAverageRatings method uses an aggregation pipeline to match all reviews for a specific tour, group them to calculate the count and average rating. Then it updates the corresponding tour with these values. The post-save middleware calls this method after a review is saved.
*/
reviewSchema.post('save', async function () {
  // this.constructor points to the current Model
  // 'this' points to the current document being saved

  await this.constructor.calcAverageRatings(this.tour);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
