const express = require('express');
const viewsController = require('../controllers/views.controller');
const authController = require('../controllers/auth.controller');
const bookingsController = require('../controllers/bookings.controller');

const router = express.Router();

router.get(
  '/',
  bookingsController.createBookingCheckout,
  authController.isLoggedIn,
  viewsController.getOverview
);
router.get('/tour/:slug', authController.isLoggedIn, viewsController.getTour);
router.get('/login', authController.isLoggedIn, viewsController.getLoginForm);
router.get('/me', authController.protect, viewsController.getAccount);
router.get('/my-tours', authController.protect, viewsController.getMyTours);

router.post(
  '/submit-user-data',
  authController.protect,
  viewsController.updateUserData
);
module.exports = router;
