const multer = require('multer');
const sharp = require('sharp');
const AppError = require('../utils/appError');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

// const multerStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'public/img/users'); // cb = callback function (err, data)
//   },
//   filename: (req, file, cb) => {
//     // name the file as user-userId02390jff-timestamp
//     const ext = file.mimetype.split('/')[1];
// cb(null, `user-${req.user.id}-${Date.now()}.${ext}`); // find a way to clean multiple files
//     // cb(null, `user-${req.user.id}.${ext}`); // to overwritten file, keep only one
//   },
// });

const multerStorage = multer.memoryStorage(); // just save in memory as buffer

const multerFilter = (req, file, cb) => {
  // check if the file is image
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images', 400), false);
  }
};

const upload = multer({
  limits: { fileSize: 5 * 1000 * 1000 }, // 5MB max file size
  fileFilter: multerFilter,
  storage: multerStorage,
});

exports.uploadUserPhoto = upload.single('photo');
// .sigle for one photo and will create req.file
// 'photo' is the field name

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();
  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`; // set property to use later
  await sharp(req.file.buffer)
    .resize(500, 500, { withoutEnlargement: true }) // not resize if img < 500x500
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`); // find a way to clean the old files !no need to await the deletion

  next();
});

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) {
      newObj[el] = obj[el];
    }
  });
  return newObj;
};

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password update. Please use /updateMyPassword.',
      ),
    );
  }

  // 2) Filter out unwanted field's names that are not allowed to be updated
  const filteredBody = filterObj(
    req.body,
    'name',
    'email',
    // 'other field names allowed to be updated',
  );
  if (req.file) filteredBody.photo = req.file.filename;

  // 3) Update user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not defined. Please use /signup instead.',
  });
};

exports.getAllUsers = factory.getAll(User);
exports.getUser = factory.getOne(User);
exports.updateUser = factory.updateOne(User); // Do not update password with this
exports.deleteUser = factory.deleteOne(User);
