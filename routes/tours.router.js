const express = require('express');
const toursController = require('../controllers/tours.controller');
const authController = require('../controllers/auth.controller');
const reviewRouter = require('./review.router');

const router = express.Router();

// router.param('id', toursController.checkId);

router.use('/:tourId/reviews', reviewRouter);

router
  .route('/top-5-cheap')
  .get(toursController.aliasTopTours, toursController.getTours);

router.route('/tour-stats').get(toursController.getTourStats);
router
  .route('/monthly-plan/:year')
  .get(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide', 'guide'),
    toursController.getMonthlyPlan
  );

router
  .route('/tours-within/:distance/center/:latlng/unit/:unit')
  .get(toursController.getToursWithin);

router.route('/distances/:latlng/unit/:unit').get(toursController.getDistances);

router
  .route('/')
  .get(toursController.getTours)
  .post(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    toursController.createTour
  ); //toursController.checkBody,

router
  .route('/:id')
  .get(toursController.getTourById)
  .patch(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    toursController.uploadTourImages,
    toursController.resizeTourImages,
    toursController.updateTour
  )
  .delete(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    toursController.deleteTour
  );

module.exports = router;
