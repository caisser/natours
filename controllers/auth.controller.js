const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/user.model');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Email = require('../utils/email');

const signToken = (payload) => {
  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRATION,
  });
  return token;
};

const createSendToken = (user, statusCode, message, res) => {
  const token = signToken({
    id: user._id,
  });

  const cookieOptions = {
    expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRATION * 1),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
  res.cookie('jwt', token, cookieOptions);

  // Remove passwords from output
  user.password = undefined;
  res.status(statusCode).json({
    status: 'success',
    message,
    token,
    data: { user },
  });
};

exports.singup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
    role: req.body.role,
  });

  const url = `${req.protocol}://${req.get('host')}/me`;
  await new Email(newUser, url).sendWelcome();
  createSendToken(newUser, 201, 'User created', res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }

  // 2) Check if user exist && password is correct
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Please provide valid email and password!', 401));
  }

  // 3) If everything is correct, send token to client
  createSendToken(user, 200, 'User logged in!', res);
});

exports.logout = (req, res, next) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: 'success' });
};

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Get the token and check if exist
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.replace('Bearer ', '');
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  if (!token) {
    return next(
      new AppError('Please login before performing this action', 401)
    );
  }
  // 2) Verification of Token
  const payload = jwt.verify(token, process.env.JWT_SECRET);

  // 3) Check if user still exists
  const user = await User.findById(payload.id);

  if (!user) {
    return next(new AppError('Invalid token, User no longer exist!!!', 401));
  }

  // 4) Check if user changed password after JWT was issued
  const isPasswordChanded = user.changedPasswordAfter(payload.iat);

  if (isPasswordChanded) {
    return next(
      new AppError('Invalid token, Password changed recently!!!', 401)
    );
  }

  // Grant access to protected route
  req.user = user;
  res.locals.user = user;
  next();
});

// Only for rendered pages, no errors!
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      // 1) Verify the token
      const payload = jwt.verify(req.cookies.jwt, process.env.JWT_SECRET);

      // 2) Check if user still exists
      const user = await User.findById(payload.id);
      if (!user) {
        return next();
      }

      // 3) Check if user changed password after JWT was issued
      const isPasswordChanded = user.changedPasswordAfter(payload.iat);
      if (isPasswordChanded) {
        return next();
      }

      // there is a logged in user
      res.locals.user = user;
      return next();
    } catch (error) {
      return next();
    }
  }
  next();
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles ['admin', 'lead-guide']
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on POSTED email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with that email address', 404));
  }
  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3) Send it to user's email
  try {
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/users/resetPassword/${resetToken}`;
    await new Email(user, resetURL).sendPasswordReset();
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError('There was an error sending the email. Try again later', 500)
    );
  }

  res.status(200).json({
    status: 'success',
    message: 'Token sent to email!',
  });
});

exports.resetPassword = async (req, res, next) => {
  // 1) Get user based on the token
  const encryptedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: encryptedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // 2) Check if token has not expired and there is an user)
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }

  // 3) Update changedPasswordAt and set the new password property for the user
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();
  // 4) Log the user in, send the JWT
  createSendToken(user, 200, 'Password updated!', res);
};

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user
  const user = await User.findById(req.user.id).select('+password');
  const { password } = req.body;
  // 2) Check if the POSTed password is correct
  if (!(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect password', 400));
  }
  // 3) If so, update the password
  user.password = req.body.newPassword;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  // 4) Log user in, send JWT
  createSendToken(user, 200, 'Password updated!', res);
});
