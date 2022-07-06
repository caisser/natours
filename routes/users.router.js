const express = require('express');
const usersController = require('../controllers/users.controller');
const authController = require('../controllers/auth.controller');

const router = express.Router();

router.post('/singup', authController.singup);
router.post('/login', authController.login);
router.get('/logout', authController.logout);
router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

// Protect all routes after this middleware
router.use(authController.protect);

router.patch('/updateMyPassword', authController.updatePassword);
router.get('/me', usersController.getMe, usersController.getUserById);
router.patch(
  '/updateMe',
  usersController.uploadUserPhoto,
  usersController.resizeUserPhoto,
  usersController.updateMe
);
router.delete('/deleteMe', usersController.deleteMe);

// Restrict next routes to admin role
router.use(authController.restrictTo('admin'));

router.route('/').get(usersController.getUsers);
// TODO implement create user
router
  .route('/:id')
  .get(usersController.getUserById)
  .patch(usersController.updateUser)
  .delete(usersController.deleteUser);

module.exports = router;
