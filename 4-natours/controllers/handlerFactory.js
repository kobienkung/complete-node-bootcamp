const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const APIFeatures = require('../utils/apiFeatures');

exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id); // no variable assigned cuz no data to send back

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(204).json({
      // 204: no content
      status: 'success',
      data: null,
    });
  });

exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true, //return the modified document rather than the original
      runValidators: true, //check the input data correctness against the model's schema e.g., put String in Number field.
    });

    if (!doc) {
      return next(new AppError('No documnet found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    // const newTour = new Tour({});
    // newTour.save();
    const doc = await Model.create(req.body);

    // const modelName = Model.modelName.toLowerCase();
    res.status(201).json({
      status: 'success',
      data: {
        data: doc,
        // [modelName + ' data']: doc,
      },
    });
  });

exports.getOne = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (popOptions) query = query.populate(popOptions);
    const doc = await query;

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

exports.getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    // for nested route
    let filter = {}; // no tour is specific, query all reviews
    if (req.params.tourId) filter = { tour: req.params.tourId }; // query all reviews only for current tour

    // EXECUTE QURTY
    const features = new APIFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .limitFiels()
      .paginate();
    const doc = await features.query;
    // const doc = await features.query.explain(); // see executionStats

    // SEND QUERY
    res.status(200).json({
      status: 'success',
      // requestAt: req.requestTime,
      results: doc.length,
      data: {
        data: doc,
      },
    });
  });
