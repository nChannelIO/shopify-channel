'use strict';

module.exports = function(flowContext, payload) {
  let output = {
    statusCode: 400,
    payload: [],
    errors: [
      'This function has not been implemented.'
    ]
  };

  return Promise.reject(output);
};
