class AppError extends Error {
  constructor(message, statusCode) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // indicates the known error that can be sent to clients not the real unknown error e.g., 3rd party error

    Error.captureStackTrace(this, this.constructor); // tells where the error occurred
  }
}

module.exports = AppError;
