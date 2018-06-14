'use strict';

module.exports = function(flowContext, payload) {
  let output = {
    statusCode: 400,
    payload: [],
    errors: [
      'Shopify does not support querying productPricing by created date.'
    ]
  };

  return Promise.reject(output);
};
