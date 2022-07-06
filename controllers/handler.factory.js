const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const doc = await Model.findByIdAndDelete(id);

    if (!doc) return next(new AppError(`No document found with Id ${id}`, 404));

    res.status(200).json({
      status: 'success',
      message: 'Document deleted',
    });
  });

exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const doc = await Model.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!doc) return next(new AppError(`No Document found with Id ${id}`, 404));

    res.status(200).json({
      status: 'success',
      message: 'Document updated',
      data: { data: doc },
    });
  });

exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.create(req.body);
    res.status(201).json({
      status: 'success',
      message: 'Document created',
      data: { data: doc },
    });
  });

exports.getOne = (Model, populateOptions) =>
  catchAsync(async (req, res, next) => {
    const { id } = req.params;
    let query = Model.findById(id);
    if (populateOptions) query = query.populate(populateOptions);

    const doc = await query;

    if (!doc) return next(new AppError(`No document found with Id ${id}`, 404));

    res.status(200).json({
      status: 'success',
      message: 'Document retrieved',
      data: { data: doc },
    });
  });

exports.getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    // Build and Execute query
    let filter = {};
    if (req.params.tourId) filter = { tour: req.params.tourId };
    const features = new APIFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    // const doc = await features.query.explain();
    const doc = await features.query;

    // Send response
    res.status(200).json({
      status: 'success',
      message: 'Documents retrieved',
      results: doc.length,
      data: { data: doc },
    });
  });
