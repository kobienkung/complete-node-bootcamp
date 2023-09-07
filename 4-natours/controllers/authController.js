const crypto = require('crypto');
const { promisify } = require('util'); // make a function to be a promise func
const jwt = require('jsonwebtoken');
const catchAsync = require('../utils/catchAsync');
const User = require('../models/userModel');
const AppError = require('../utils/appError');
const Email = require('../utils/email');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const creatSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    ), // day to millisecond
    httpOnly: true,
  };
  if (process.env.NODE_ENV === 'production') {
    cookieOptions.secure = true; // always set to be true, but need to test with postman first
  }

  res.cookie('jwt', token, cookieOptions); // send token as cookie (prevents xss attack)

  //  Remove password from output
  if (user.password) {
    user.password = undefined;
  }

  res.status(statusCode).json({
    status: 'success',
    // token, // token to send to the user, not save on the database
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    // specify the except fields, otherwise unwanted access can be put by users e.g., admin
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
    role: req.body.role,
  });

  const url = `${req.protocol}://${req.get('host')}/me`;
  console.log(url);
  await new Email(newUser, url).sendWelcome();

  creatSendToken(newUser, 201, res);
});

// No need to catchAsync to alert the error, in case if there is no token, use try catch
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body; // const email = req.body.email

  // 1) check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }

  // 2) check if user exists && password correct
  const user = await User.findOne({ email: email }).select('+password'); // select unshown model field
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  // 3) If everything is ok, send token to the client
  creatSendToken(user, 200, res);
});

// send fake content cookie to modify real cookie instead of delete it
exports.logout = (req, res) => {
  res.clearCookie('jwt');
  // const cookieOptions = {
  //   expires: new Date(Date.now() + 10 * 1000), // expires in 10 sec
  //   httpOnly: true,
  // };
  // res.cookie('jwt', 'loggedout', cookieOptions);

  res.status(200).json({ status: 'success' });
  console.log(res.data.status);
  console.log(res.data);
};

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and checking if it's there
  let token;
  const { cookie } = req.headers;
  const wantedCookieName = 'jwt';
  if (req.cookies.jwt) {
    token = req.cookies.jwt;
  } else if (cookie) {
    const value = `; ${cookie}`;
    const parts = value.split(`; ${wantedCookieName}=`);
    if (parts.length === 2) {
      token = parts.pop().split(';').shift();
    }
  }

  if (!token) {
    res.redirect('/');
    return next(
      new AppError('You are not logged in! Please log in to get access.', 401),
    );
  }

  // 2) Token verification
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  // Get and check if data payload hasn't been manipulated by malicious

  // 3) Check if user still exists: in case if the user is deleted
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError(
        'The user beloging to this token does no longer exist.',
        401,
      ),
    );
  }

  // 4) Check if user changed password after the JWT token was issued
  if (currentUser.changePasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! Please log in again', 401),
    );
  }

  // Grant access to protected route
  req.user = currentUser;
  res.locals.user = currentUser; // make available to http templates
  next();
});

// Only for rendering page: user pictur if user logged in, no error
exports.isLoggedIn = catchAsync(async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      // 1) Verify token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET,
      );

      // 2) Check if user still exists: in case if the user is deleted
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // 4) Check if user changed password after the JWT token was issued
      if (currentUser.changePasswordAfter(decoded.iat)) {
        return next();
      }

      // Ther is a logged in user
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
});

// check role permissions befor next middleware
exports.restrictTo =
  (...roles) =>
  // receive n input as array and return a function
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action.', 403),
      );
    }

    next();
  };

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // Get user on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with that email address.', 404));
  }

  // Generate random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false }); // turn off validation, otherwise password is required

  // Send it to user's email
  try {
    const resetURL = `${req.protocol}://${req.get(
      'host',
    )}/api/v1/users/resetPassword/${resetToken}`;
    // e.g. http://127.0.0.1:3000/api/v1/users/resetPassword/c1a20f431b767d8
    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Token was sent to email',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        'There was an error sending reset password email. Try again later.',
        500,
      ),
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token and token expired time
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // 2) If token has not expired, and there is a user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save(); // not user.findAndUpdate cuz everything about password need to be run validations

  // 3) Update changedPasswordAt property for the user using method in userModel
  // 4) Log the user in, send JWT
  creatSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user from collection
  const user = await User.findById(req.user.id).select('+password');

  // 2) Check if POSTed current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong', 401));
  }

  // 3) If so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  // 4) Log user in, send JWT
  creatSendToken(user, 200, res);
});
