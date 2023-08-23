const Tour = require('../models/tourModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');

// 2) ROUTE HANDLERS
exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

exports.getAllTours = factory.getAll(Tour);

// console.log(req.params);
// const id = req.params.id * 1;
// const tour = tours.find((el) => el.id === id);
// const tour = await Tour.findById(req.params.id).populate('reviews'); // pass the name of virtual propperty to populate
// work as the same as Tour.findOne({ _id: req.params.id });
exports.getTour = factory.getOne(Tour, { path: 'reviews' });
exports.createTour = factory.createOne(Tour);
exports.updateTour = factory.updateOne(Tour);
exports.deleteTour = factory.deleteOne(Tour);
// exports.deleteTour = catchAsync(async (req, res, next) => {
//   const tour = await Tour.findByIdAndDelete(req.params.id); // no variable assigned cuz no data to send back

//   if (!tour) {
//     return next(new AppError('No tour found with that ID', 404));
//   }

//   res.status(204).json({
//     // 204: no content
//     status: 'success',
//     data: null,
//   });
// });

exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } },
    },
    {
      $group: {
        _id: { $toUpper: '$difficulty' }, // %toUpper is the MongoDB operator
        numTour: { $sum: 1 }, // sum each tour with value of 1
        numRating: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    {
      $sort: { avgPrice: 1 }, // Have to choose from the selected fields above($group) & 1 == ASC, -1 == DES
    },
    // {
    //   $match: { _id: { $ne: 'EASY' } }, // $match can be used multiple times
    // },
  ]);

  res.status(200).json({
    status: 'success',
    data: { stats },
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1;
  const plan = await Tour.aggregate([
    // aggregation pip line
    {
      $unwind: '$startDates', // split 1 tour with array of 3 stratDates into 3 tours, each with one startDate
    },
    {
      $match: {
        startDates: { $gte: new Date(`${year}-01-01`) },
        startDates: { $lte: new Date(`${year}-12-31`) },
      },
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        numTourStarts: { $sum: 1 },
        tours: { $push: '$name' }, // $push make an array of field values
      },
    },
    {
      $addFields: { month: '$_id' },
    },
    {
      $project: {
        _id: 0, // 0 means not show, 1 == show
      },
    },
    {
      $sort: { numTourStarts: -1 },
    },
    {
      $limit: 12, // limit number of output documents
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: { plan },
  });
});

// tours-within/:distance/center/:latlng/unit/:unit
// tours-within/233/center/34.111745,-118.113491/unit/mi
exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  if (!lat || !lng)
    return next(
      new Error(
        'Please provide a latitude and longitude in the format lat,lng',
        400,
      ),
    );

  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1; // radian: div by earth's radius

  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } }, // also 2dsphere index required
  });

  console.log(distance, lat, lng, unit);
  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours,
    },
  });
});

exports.getTourDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const multiplier = unit === 'mi' ? 0.000621371 : 0.001; // from default m. to miles or km.

  if (!lat || !lng)
    next(
      new AppError(
        'Please provide a latitude and longitude in the format lat,lng',
        400,
      ),
    );

  const distances = await Tour.aggregate([
    // geoNear has to be first in aggregation pipeline & have geo index set
    {
      $geoNear: {
        near: {
          tyep: 'Point',
          coordinates: [lng * 1, lat * 1],
        }, // also 2dsphere index required
        distanceField: 'distance', // name the field
        distanceMultiplier: multiplier,
      },
    },
    {
      $project: {
        // select the field
        name: 1,
        distance: 1,
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    results: distances.length,
    data: {
      data: distances,
    },
  });
});

// no longer needed
// const fs = require('fs');
// const tours = JSON.parse(
//   fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`),
// );

// exports.checkID = (req, res, next, val) => {
//   console.log(`This id is: ${val}`);
//   if (req.params.id * 1 > tours.length) {
//     return res.status(404).json({
//       // 404: not found
//       status: 'fail',
//       message: 'Invalid ID',
//     });
//   }
//   next();
// };

// exports.checkBody = (req, res, next) => {
//   if (!req.body.name || !req.body.price) {
//     return res.status(404).json({
//       status: 'fial',
//       messege: 'Missing name or price',
//     });
//   }
//   next();
// };

// const tours = await Tour.find()
//   .where('duration')
//   .equals(5)
//   .where('difficulty')
//   .equals('easy');

// exports.createTour = (req, res) => {
//   console.log(req.body);
//   const newId = tours[tours.length - 1].id + 1;
//   const newTour = Object.assign({ id: newId }, req.body);

//   tours.push(newTour); // add new tour in the array

//   fs.writeFile(
//     `${__dirname}/dev-data/data/tours-simple.json`,
//     JSON.stringify(tours),
//     (err) => {
//       res.status(201).json({
//         // 201:
//         status: 'success',
//         data: {
//           tours: newTour,
//         },
//       });
//     },
//   );
// };

// exports.createTour = async (req, res, next) => {
//   try {
//     // const newTour = new Tour({});
//     // newTour.save();
//     const newTour = await Tour.create(req.body);

//     res.status(201).json({
//       status: 'success',
//       data: {
//         tours: newTour,
//       },
//     });
//   } catch (err) {
//     res.status(400).json({
//       status: 'fail',
//       message: err,
//     });
//   }
// };
