'use strict';

module.exports = function(flowContext, query) {
  let output = {
    statusCode: 400,
    query: [],
    errors: [
      'Shopify does not support querying productPricing by created date.'
    ]
  };

  return Promise.reject(output);
};
