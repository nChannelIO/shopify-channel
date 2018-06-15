'use strict';

module.exports = function (flowContext, payload) {
  let out = {};

  if (payload.doc.BillingCustomer) {
    out.payload = payload.doc.BillingCustomer;
    out.statusCode = 200;
  } else {
    out.statusCode = 204;
  }

  return out;
};
