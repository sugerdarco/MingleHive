class ApiError extends Error {
    constructor(statusCode, message="Something want wrong !!!", error=[], stack="") {
        super();
        this.data = null;
        this.statusCode = statusCode;
        this.message = message;
        this.success = false;
        this.error = error;

        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

export {ApiError};