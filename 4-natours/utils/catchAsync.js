// A function to call a function and catch the error, instead of using the try/catch for each CRUD
module.exports = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch((err) => next(err));
  };
};
