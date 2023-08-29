const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xssClean = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser'); // read cookie

const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const viewRouter = require('./routes/viewRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');

const app = express();

// For redering
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// 1) GLOBAL MIDDLEWARES
// Serving static files
app.use(express.static(path.join(__dirname, 'public'))); // give access to the local files

// Set security HTTP headers
app.use(helmet());

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev')); // give log in the termianl like "GET /api/v1/tours?duration=5&diffuculty=easy 200 3978.945 ms - 9387"
}

// Allow 100 requests per IP in 1 hr. To protect brute force
const limiter = rateLimit({
  max: 100,
  windowsMs: 60 * 60 * 1000, // 1 hr. in ms
  message: 'Too many requests for this IP. Please try again in an hour!',
});
app.use('/api', limiter); // if the app restarts, it will count from 0 again

// Body parser, reading data from body to req.body
app.use(express.json({ limit: '10kb' })); // middle ware for modifying incoming request data e.g., make req.body
app.use(express.urlencoded({ extended: true, limit: '10kb' })); // get data from a form
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xssClean()); // e.g. name: “<div id=’bad-name’>name</div>

// Prevent HTTP parameter polution
app.use(
  hpp({
    whitelist: [
      // can use double query e.g., '?duration=5&duration=9'
      'duration', // can be more dinamic listing
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  }),
);

// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.cookie);
  // console.log(req.headers); // to check JWT
  next(); //never forget to call next otherwise the process will stuck
});

// 3) ROUTES
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
// app.get('/api/v1/tours', getAllTours);
// app.get('/api/v1/tours/:id', getTour);
// app.post('/api/v1/tours', createTour);
// app.patch('/api/v1/tours/:id', updateTour);
// app.delete('/api/v1/tours/:id', deleteTour);

// If this last middleware is reached, then there is no given route
app.all('*', (req, res, next) => {
  // all('*') catches all req(get post patch delete) and routes('./blah/blahblah')
  // res.status(404).json({
  //   status: 'fail',
  //   message: `Can't find ${req.originalUrl} on this server!`,
  // });
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
  // whatever is passed in next() = error, and will skip all middlewares jump into error middleware
});

// middleware with 4 variables == error handler recognised by express
app.use(globalErrorHandler);

module.exports = app;
