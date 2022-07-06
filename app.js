const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const compression = require('compression');

const AppError = require('./utils/appError');
const errorHandler = require('./controllers/error.controller');
const toursRouter = require('./routes/tours.router');
const usersRouter = require('./routes/users.router');
const reviewsRouter = require('./routes/review.router');
const bookingsRouter = require('./routes/bookings.router');
const viewsRouter = require('./routes/views.router');

const app = express();

// Server side rendering with PUG, supported by node
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Global Middlewares
// Serving static files
// app.use(express.static(`${__dirname}/public`));
app.use(express.static(path.join(__dirname, 'public')));

// Security HTTP headers
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      scriptSrc: [
        "'self'",
        'https://*.cloudflare.com',
        'https://js.stripe.com/',
      ],
      frameSrc: ["'self'", 'https://js.stripe.com/'],
      connectSrc: ["'self'", 'ws://localhost:*'],
    },
  })
);

// Logs for Development
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Limit request from same IP
const limiter = rateLimit({
  max: 100,
  windowMs: 3600000,
  message: 'Too many request from this IP, please try again in an hour!',
});
app.use('/api', limiter);

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Data Sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data Sanitization against XSS (Cross site scripting)
app.use(xss());

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  })
);

app.use(compression());

// test middleware
app.use((req, res, next) => {
  // console.log(req.cookies);
  next();
});

// Routes
app.use('/', viewsRouter);

app.use('/api/tours', toursRouter);
app.use('/api/users', usersRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/bookings', bookingsRouter);

app.all('*', (req, res, next) => {
  // Error custom class
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(errorHandler);

module.exports = app;
