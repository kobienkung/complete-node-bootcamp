const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator'); // from github
// const User = require('./userModel');

// Create a schema
const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'], // [true, false_warning]
      unique: true,
      trim: true,
      maxlength: [40, 'A tour name must have 10 to 40 characters'],
      minlength: [10, 'A tour name must have 10 to 40 characters'],
      validate: {
        validator: (val) => validator.isAlpha(val, ['en-US'], { ignore: ' ' }),
        message: 'Tour name must only contains characters',
      },
      // validate just need a fucntion and don't need to call right away like .isAlpha()
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
      required: [true, 'A tour must have a difficulty'],
      enum: {
        // a validator for string
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is either: easy, medium, difficult',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be between 1.0 and 5.0'],
      max: [5, 'Rating must be between 1.0 and 5.0'],
      set: (val) => Math.round(val * 10) / 10, // 4.6666 46.6666 47 4.7
      // set will run the function each time value is changed
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
      validate: {
        validator: function (val) {
          // return validator func with true or false
          return val <= this.price && val >= 0;
          // val == current value (priceDiscount), this == this new document that is creating so it won't work on updating function
        },
        message: 'Discount price {VALUE} should be below the regular price', // {VALUE} is internal MongoDB command
      },
    },
    summary: {
      type: String,
      trim: true, // remove all spaces from the beginning and the end of the string
      required: [true, 'A tour must have a summary'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String, // name of the image to read the file
      required: [true, 'A tour must have a conver image'],
    },
    images: [String], // multiple image's names in an array
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false, // never show in select query
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      type: {
        type: String,
        default: 'Point', // GeoJSON: MongoDB build in e.g., 'Line', 'Polygon' etc.
        enum: ['Point'],
      },
      coordinates: [Number], // longitude and latitude (normally in the another way around)
      address: String,
      description: String,
    },
    locations: [
      // put oject inside an array to create child doc(location) into parent doc(tour)
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
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    // optional data
    toObject: { virtuals: true }, // also gives out the JSON data, use with Tourschema.virtual function
    toJSON: { virtuals: true },
  },
);

// Set index: !!!unused index has to be removed manually in MongoDB compass
tourSchema.index({ price: 1, ratingsAverage: -1 }); // -1 == DES
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' }); // earth coordinates

tourSchema.virtual('durationWeeks').get(function () {
  // not using arrow function cuz it has no access to this.object
  // virtual property that is created each time of the query and can not really in DB so can't use query like Tour.find()
  return this.duration / 7;
});

// Virtual populate: get child doc
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour', // the field that the child ref of this doc
  localField: '_id', // the field that matchs the child ref
});

// DOCUMENT MIDDLEWARE: runs before .save() and .create()
tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true }); // add text to the url, this. is pointing to the document
  next();
});

// tourSchema.pre('save', async function (next) {
//   const guidesPromises = this.guides.map(async (id) => await User.findById(id));
//   // map() return right away and got an array of promises instead of the data, need to call it again
//   this.guides = await Promise.all(guidesPromises);
//   next();
// });

// tourSchema.pre('save', function (next) {
//   console.log('Will save document');
//   next();
// });

// tourSchema.post('save', function (doc, next) {
//   // doc is the document that is just saved
//   console.log(doc);
//   next();
// });

// QUERY MIDDLEWARE
tourSchema.pre(/^find/, function (next) {
  // /^find/ == regex that hook every command begins with 'find'
  // tourSchema.pre('find', function (next) {
  // this middleware will hook find() function and do the following actions
  // this. is pointing at the query
  this.find({ secretTour: { $ne: true } });
  this.start = Date.now();
  next();
});

tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides', // populate() = fill up; populate() is another query then affect the performance
    select: '-__v -passwordChangedAt', // unselect some fields
  });
  next();
});

tourSchema.post(/^find/, function (docs, next) {
  console.log(`Query took ${Date.now() - this.start} milliseconds`);
  // console.log(docs);
  next();
});

// AGGREATION MIDDLEWARE
// this. is pointing to aggregation object for .pre('aggregate)
tourSchema.pre('aggregate', function (next) {
  // do not unshift $geoNear
  if (!this.pipeline()[0].$geoNear) {
    this.pipeline().unshift({
      $match: { secretTour: { $ne: true } },
    });
  }
  // console.log(this.pipeline());
  next();
});

// Create a model out of the schema
const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
