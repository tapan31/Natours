const express = require('express'); // Import Express
const path = require('path');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const cors = require('cors');

const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const viewRouter = require('./routes/viewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const bookingController = require('./controllers/bookingController');

/* 
    - This calls the Express function, which creates an instance of an Express application.
    - app is now an instance of the Express application.
    - This instance is used to define routes, middleware, and start the server.
*/
const app = express();

app.enable('trust-proxy');

// Setting up template engine
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// GLOBAL MIDDLEWARES

// Implement CORS
app.use(cors());

// Allow request only from a specific origin
/* app.use(cors({
  origin: 'https://example.com'
})) */

// Pre flight phase, options request
app.options('*', cors());
// app.options('/api/v1/tours/:id', cors());

// Built-in middleware to serve static files (html, css, js, images etc.) from a folder
app.use(express.static(path.join(__dirname, 'public')));

// Set security headers
// app.use(helmet());
const scriptSrcUrls = [
  'https://unpkg.com/',
  'https://tile.openstreetmap.org',
  'https://cdn.jsdelivr.net',
];
const styleSrcUrls = [
  'https://unpkg.com/',
  'https://tile.openstreetmap.org',
  'https://fonts.googleapis.com/',
];
const connectSrcUrls = ['https://unpkg.com', 'https://tile.openstreetmap.org'];
const fontSrcUrls = ['fonts.googleapis.com', 'fonts.gstatic.com'];

/* app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: [],
      connectSrc: ["'self'", ...connectSrcUrls],
      scriptSrc: ["'self'", ...scriptSrcUrls],
      styleSrc: ["'self'", "'unsafe-inline'", ...styleSrcUrls],
      workerSrc: ["'self'", 'blob:'],
      objectSrc: [],
      imgSrc: ["'self'", 'blob:', 'data:', 'https:'],
      fontSrc: ["'self'", ...fontSrcUrls],
    },
  }),
); */

// app.use() adds the middleware to the middleware stack and then they are processed in the order they are defined in the code
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev')); // morgan is a 3rd party logger middleware
}

// Limit requests from same IP address
const limiter = rateLimit({
  max: 100, // Number of requests allowed
  windowMs: 60 * 60 * 1000, // Time window in which certain number of requests are allowed
  message: 'Too many requests from this IP, please try again after an hour', // Error message
});
app.use('/api', limiter);

/* app.get('/', (req, res) => {
  res.send('Hello World');
  //   res.status(200).json({ message: 'Hello from the server' });
}); */

/* NOTE
  We are doing this request here instead of the bookingRouter because we need the req data in raw form instead of json. 
  So we need to do this request before we use the express.json() middleware otherwise the req data would be converted to json
*/
app.post(
  '/webhook-checkout',
  express.raw({ type: 'application/json' }),
  bookingController.webhookCheckout,
);

/* 
  - It is a built-in middleware in express. The primary function of express.json() is to parse requests with a Content-Type header of application/json. Once parsed, the resulting data is stored in the req.body, allowing easy access to the JSON content sent from the client.
  - This middleware parses incoming JSON data from the request body and makes it available in req.body.
  - We can also limit the size of body by passing a limit option
*/
app.use(express.json({ limit: '10kb' }));

// Parse data coming from a url-encoded form
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Parse cookies from incoming request and add them in the req object as req.cookies
app.use(cookieParser());

// Data Sanitization against NoSQL Query Injection
app.use(mongoSanitize());

// Data Sanitization against XSS Attacks
app.use(xss());

// Preventing Parameter Pollution
// It removes duplicate parameters from req.params but we can whitelist some parameters
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsAverage',
      'ratingsQuantity',
      'price',
      'maxGroupSize',
      'difficulty',
    ],
  }),
);

app.use(compression());

// Custom Middleware
app.use((req, res, next) => {
  // console.log('Middleware Executed');
  // console.log(req.cookies);
  next();
});

app.use((req, res, next) => {
  // We can add custom properties in the req object and use them later
  req.requestTime = new Date().toISOString();
  // console.log(req.headers);
  next();
});

// app.use('/api/v1/tours', tourRoutes); tells Express to prepend /api/v1/tours to all routes inside tourRoutes.

// Routes
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

/* 
  - Handling unknown routes
  - 'all' method will run for all the http methods (get, post, patch, delete, put, etc.)
  - * matches any route
*/
app.all('*', (req, res, next) => {
  /* res.status(404).json({
    status: 'fail',
    message: `Cannot find ${req.method} ${req.originalUrl}`,
  }); */

  /* const err = new Error(`Cannot find ${req.method} ${req.originalUrl}`);
  err.statusCode = 404;
  err.status = 'fail'; 
  next(err); */

  /* Whenever we pass an argument in next(), then express will automatically assume that its an error and it will skip all the other middlewares in the middleware stack and directly call the error handling middleware with the error that we passed in next() */
  next(new AppError(`Cannot find ${req.method} ${req.originalUrl}`, 404));
});

// Error handling middleware
app.use(globalErrorHandler);

module.exports = app;
