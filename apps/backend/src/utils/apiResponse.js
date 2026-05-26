const sendSuccess = (res, data = null, meta = null, status = 200) => {
  return res.status(status).json({
    success: true,
    data,
    error: null,
    meta
  });
};

const sendError = (res, code, message, fields = null, status = 400) => {
  return res.status(status).json({
    success: false,
    data: null,
    error: {
      code,
      message,
      fields
    },
    meta: null
  });
};

module.exports = {
  sendSuccess,
  sendError
};
