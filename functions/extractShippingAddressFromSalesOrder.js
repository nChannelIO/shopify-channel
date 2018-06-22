'use strict';

module.exports = function (flowContext, payload) {
  let out = {};

  if (payload.doc.ShippingAddress) {
    out.payload = payload.doc.ShippingAddress;
    out.statusCode = 200;
  } else {
    out.statusCode = 204;
  }

  return out;
};
