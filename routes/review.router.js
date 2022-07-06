const express = require('express');
const reviewController = require('../controllers/reviews.controller');
const authController = require('../controllers/auth.controller');

const router = express.Router({ mergeParams: true });
router.use(authController.protect);
//POST /tours/123123123/reviews is same as
//POST /reviews
//GET /tours/123123123/reviews is same as
//GET /reviews

router
  .route('/')
  .get(reviewController.getReviews)
  .post(
    authController.restrictTo('user'),
    reviewController.setTourUserIds,
    reviewController.createReview
  );

router
  .route('/:id')
  .get(reviewController.getReviewById)
  .patch(
    authController.restrictTo('admin', 'user'),
    reviewController.updateReview
  )
  .delete(
    authController.restrictTo('admin', 'user'),
    reviewController.deleteReview
  );

module.exports = router;
