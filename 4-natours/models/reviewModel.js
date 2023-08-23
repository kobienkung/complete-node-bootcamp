const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review can not be empty'],
    },
    rating: {
      type: Number,
      min: [1, 'Rating must be in range between 1 and 5'],
      max: [5, 'Rating must be in range between 1 and 5'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour.'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user.'],
    },
  },
  {
    // make virtual properties available
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  },
);

reviewSchema.index({ tour: 1, user: 1 }, { unique: true }); // make Review unique for 1user & 1tour

reviewSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'user',
    select: 'name photo',
  }); // .lean() unselected virtual properties and populated values in tour
  // .populate({
  //   path: 'tour',
  //   select: 'name',
  // });

  next();
});

// .statics are the function defined on the Model. .methods are the function defined on the document
reviewSchema.statics.calcAverageRatings = async function (tourId) {
  const states = await this.aggregate([
    // .this of static method always point to declared model(Review)
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: '$tour', // group by the tour id
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);
  // console.log(states);

  if (states.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: states[0].nRating,
      ratingsAverage: states[0].avgRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0, // set default values
      ratingsAverage: 4.5,
    });
  }
};

reviewSchema.post(/save|^findOneAnd/, (doc) => {
  if (doc) Review.calcAverageRatings(doc.tour); // modified lecture169
  // await doc.constructor.calcAverageRatings(doc.tour);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;

// reviewSchema.post('save', function () {
//   // this points to current review
//   // post doesn't have access to next() but the doc
//   Review.calcAverageRatings(this.tour); // modified
//   // this.constructor.calcAverageRatings(this.tour); // .constructor is the model who created it
// });

// reviewSchema.post(/^findOneAnd/, function (doc) {
//   console.log(doc);
//   if (doc) Review.calcAverageRatings(doc.tour); // modified lecture169
//   // await doc.constructor.calcAverageRatings(doc.tour);
// });
