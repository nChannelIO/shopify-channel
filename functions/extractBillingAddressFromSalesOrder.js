'use strict';

module.exports = function (flowContext, payload) {
  let out = {};

  if (payload.doc.BillingAddress) {
    out.payload = payload.doc.BillingAddress;
    out.statusCode = 200;
  } else {
    out.statusCode = 204;
  }

  return out;
};
