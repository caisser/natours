const express = require('express');
const bookingsController = require('../controllers/bookings.controller');
const authController = require('../controllers/auth.controller');

const router = express.Router();

router.use(authController.protect);

router.get('/checkout-session/:tourId', bookingsController.getCheckoutSession);

router.use(authController.restrictTo('admin', 'lead-guide'));

router
  .route('/')
  .get(bookingsController.getBookings)
  .post(bookingsController.createBooking);

router
  .route('/:id')
  .get(bookingsController.getBookingById)
  .patch(bookingsController.updateBooking)
  .delete(bookingsController.deleteBooking);

module.exports = router;
