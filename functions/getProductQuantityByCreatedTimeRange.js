'use strict';

module.exports = function(flowContext, query) {
  let output = {
    statusCode: 400,
    query: [],
    errors: [
      'This function has not been implemented.'
    ]
  };

  return Promise.reject(output);
};
