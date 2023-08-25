const Tour = require('../models/tourModel');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getOverview = catchAsync((req, res, next) => {
  // 1) Get the tour data from collection
  const tours = Tour.find();

  // 2) Build template
  // 3) Render that template using tour data from 1)
  res.status(200).render('base', {
    title: 'All tours',
    tours,
  }); // will look in __direname + views
});

exports.getTour = catchAsync(async (req, res, next) => {
  // 1) Get the data from the requested tour (including reviews and guides)
  const tour = await Tour.findOne({
    name: req.params.slug,
  }).populate({
    path: 'reviews',
    select: 'review rating user',
  });

  if (!tour) {
    return next(new AppError('No tour found with that name', 404));
  }

  // 2) build template
  // 3) Render that template using the data
  res.status(200).render('tour', {
    title: 'The Fores Hiker Tour',
    tour,
  });
});

exports.getLoginForm = (req, res) => {
  res.status(200).render('login', {
    title: 'Log in to your account',
  });
};

exports.getAccount = (req, res) => {
  res.status(200).render('account', {
    title: 'Log in to your account',
  });
};

exports.updateUserData = catchAsync(async (req, res, next) => {
  const updateUser = await User.findByIdAndUpdate(
    req.user.id,
    {
      // req.user from protect
      name: req.body.name,
      email: req.body.email,
    },
    {
      new: true,
      runValidators: true,
    },
  );

  res.status(200).render('account', {
    title: 'Your account',
    user: updateUser,
  });
});
