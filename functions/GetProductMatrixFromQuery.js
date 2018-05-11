'use strict';

let Promise = require('bluebird');
let request = require('request-promise');
let errors = require('request-promise/errors');
const extractBusinessReference = require('../util/extractBusinessReference');

let GetProductMatrixFromQuery = function (ncUtil,
                                          channelProfile,
                                          flowContext,
                                          payload,
                                          callback) {
  
  let out = {
    ncStatusCode: null,
    response: {},
    payload: {}
  };
  
  let invalid = false;
  let invalidMsg = "";
  
  //If channelProfile does not contain channelSettingsValues, channelAuthValues or productMatrixBusinessReference, the request can't be sent
  if (!channelProfile) {
    invalid = true;
    invalidMsg = "channelProfile was not provided"
  } else if (!channelProfile.channelSettingsValues) {
    invalid = true;
    invalidMsg = "channelProfile.channelSettingsValues was not provided"
  } else if (!channelProfile.channelSettingsValues.protocol) {
    invalid = true;
    invalidMsg = "channelProfile.channelSettingsValues.protocol was not provided"
  } else if (!channelProfile.channelAuthValues) {
    invalid = true;
    invalidMsg = "channelProfile.channelAuthValues was not provided"
  } else if (!channelProfile.channelAuthValues.access_token) {
    invalid = true;
    invalidMsg = "channelProfile.channelAuthValues.access_token was not provided"
  } else if (!channelProfile.channelAuthValues.shop) {
    invalid = true;
    invalidMsg = "channelProfile.channelAuthValues.shop was not provided"
  } else if (!channelProfile.productMatrixBusinessReferences) {
    invalid = true;
    invalidMsg = "channelProfile.productMatrixBusinessReferences was not provided"
  } else if (!Array.isArray(channelProfile.productMatrixBusinessReferences)) {
    invalid = true;
    invalidMsg = "channelProfile.productMatrixBusinessReferences is not an array"
  } else if (channelProfile.productMatrixBusinessReferences.length === 0) {
    invalid = true;
    invalidMsg = "channelProfile.productMatrixBusinessReferences is empty"
  }
  
  //If a product document was not passed in, the request is invalid
  if (!payload) {
    invalid = true;
    invalidMsg = "payload was not provided"
  } else if (!payload.doc) {
    invalid = true;
    invalidMsg = "payload.doc was not provided";
  } else if (payload.doc.searchFields) {
    invalid = true;
    invalidMsg = "Searching for products is not supported";
  } else if (!payload.doc.remoteIDs && !payload.doc.modifiedDateRange) {
    invalid = true;
    invalidMsg = "either payload.doc.remoteIDs or payload.doc.modifiedDateRange must be provided"
  } else if ((payload.doc.remoteIDs && (payload.doc.createdDateRange || payload.doc.modifiedDateRange)) || (payload.doc.createdDateRange && payload.doc.modifiedDateRange)) {
    invalid = true;
    invalidMsg = "only one of payload.doc.remoteIDs or payload.doc.createdDateRange or payload.doc.modifiedDateRange may be provided"
  } else if (payload.doc.remoteIDs && (!Array.isArray(payload.doc.remoteIDs) || payload.doc.remoteIDs.length === 0)) {
    invalid = true;
    invalidMsg = "payload.doc.remoteIDs must be an Array with at least 1 remoteID"
  } else if (payload.doc.modifiedDateRange && !(payload.doc.modifiedDateRange.startDateGMT || payload.doc.modifiedDateRange.endDateGMT)) {
    invalid = true;
    invalidMsg = "at least one of payload.doc.modifiedDateRange.startDateGMT or payload.doc.modifiedDateRange.endDateGMT must be provided"
  } else if (payload.doc.modifiedDateRange && payload.doc.modifiedDateRange.startDateGMT && payload.doc.modifiedDateRange.endDateGMT && (payload.doc.modifiedDateRange.startDateGMT > payload.doc.modifiedDateRange.endDateGMT)) {
    invalid = true;
    invalidMsg = "startDateGMT must have a date before endDateGMT";
  } else if (payload.doc.createdDateRange && !(payload.doc.createdDateRange.startDateGMT || payload.doc.createdDateRange.endDateGMT)) {
    invalid = true;
    invalidMsg = "at least one of payload.doc.createdDateRange.startDateGMT or payload.doc.createdDateRange.endDateGMT must be provided"
  } else if (payload.doc.createdDateRange && payload.doc.createdDateRange.startDateGMT && payload.doc.createdDateRange.endDateGMT && (payload.doc.createdDateRange.startDateGMT > payload.doc.createdDateRange.endDateGMT)) {
    invalid = true;
    invalidMsg = "startDateGMT must have a date before endDateGMT";
  }
  
  //If callback is not a function
  if (!callback) {
    throw new Error("A callback function was not provided");
  } else if (typeof callback !== 'function') {
    throw new TypeError("callback is not a function")
  }
  
  if (!invalid) {
    let baseURI = channelProfile.channelSettingsValues.protocol + "://" + channelProfile.channelAuthValues.shop;
    let headers = {
      "X-Shopify-Access-Token": channelProfile.channelAuthValues.access_token
    };
    let options = {
      method: 'GET',
      headers: headers,
      json: true
    };

    let promise;

    if (payload.doc.remoteIDs) {
      promise = getProductMatrixByIDs(options, baseURI, payload.doc.remoteIDs, payload.doc.page, payload.doc.pageSize);
    } else if (payload.doc.modifiedDateRange) {
      promise = getProductMatrixByTimeRange(options, baseURI, payload.doc.modifiedDateRange.startDateGMT, payload.doc.modifiedDateRange.endDateGMT, payload.doc.page, payload.doc.pageSize)
    } else {
      promise = getProductMatrixByTimeRange(options, baseURI, payload.doc.createdDateRange.startDateGMT, payload.doc.createdDateRange.endDateGMT, payload.doc.page, payload.doc.pageSize)
    }

    promise.then(products => {
      return enrichWithMetafields(options, baseURI, products);

    }).then(enrichedProducts => {
      out.ncStatusCode = enrichedProducts.length === payload.doc.pageSize ? 206 : (enrichedProducts.length > 0 ? 200 : 204);
      out.payload = [];

      enrichedProducts.forEach(enrichedProduct => {
        let product = {
          product: enrichedProduct
        };
        out.payload.push({
          doc: product,
          productMatrixRemoteID: product.product.id,
          productMatrixBusinessReference: extractBusinessReference(channelProfile.productMatrixBusinessReferences, product)
        });
      })
    }).catch(errors.StatusCodeError, reason => {
      out.response.endpointStatusCode = reason.statusCode;
      out.response.endpointStatusMessage = reason.response.statusMessage;
      if (reason.statusCode === 429) {
        out.ncStatusCode = 429;
        out.payload.error = reason.error;
      } else if (reason.statusCode >= 500) {
        out.ncStatusCode = 500;
        out.payload.error = reason.error;
      } else if (reason.statusCode === 404) {
        out.ncStatusCode = 404;
        out.payload.error = reason.error;
      } else if (reason.statusCode === 422) {
        out.ncStatusCode = 400;
        out.payload.error = reason.error;
      } else {
        out.ncStatusCode = 400;
        out.payload.error = reason.error;
      }
      logError(`The endpoint returned an error status code: ${reason.statusCode} error: ${reason.error}`);

    }).catch(errors.RequestError, reason => {
      out.response.endpointStatusCode = 'N/A';
      out.response.endpointStatusMessage = 'N/A';
      out.ncStatusCode = 500;
      out.payload.error = reason.error;
      logError(`The request failed: ${reason.error}`);

    }).catch(error => {
      out.ncStatusCode = 500;
      out.payload.error = error;

    }).finally(() => {
      try {
        callback(out);
      } catch (err) {
        logError(err);
      }
    });
  } else {
    log("Callback with an invalid request - " + invalidMsg);
    out.ncStatusCode = 400;
    out.payload.error = invalidMsg;
    callback(out);
  }
};

function getProductMatrixByIDs(options, baseURI, remoteIDs, page=1, pageSize=50) {
  options.uri = `${baseURI}/admin/products.json?ids=${remoteIDs}&page=${page}&limit=${pageSize}`;

  log(`Requesting [${options.method} ${options.uri}]`);

  return request(options).then(body => body.products);
}

function getProductMatrixByTimeRange(options, baseURI, startTime, endTime, page=1, pageSize=50) {
  let queryParams =[];
//Queried dates are exclusive so skew by 1 ms to create an equivalent inclusive range
  if (startTime) {
    queryParams.push("updated_at_min=" + new Date(Date.parse(startTime) - 1).toISOString());
  }
  if (endTime) {
    queryParams.push("updated_at_max=" + new Date(Date.parse(endTime) + 1).toISOString());
  }

  queryParams.push(`page=${page}`);
  queryParams.push(`limit=${pageSize}`);

  options.uri = `${baseURI}/admin/products.json?${queryParams.join('&')}`;

  log(`Requesting [${options.method} ${options.uri}]`);

  return request(options).then(body => body.products);
}

function enrichWithMetafields(options, baseURI, products) {
  return Promise.all(products.map(product => {
    let uri = baseURI + `/admin/products/${product.id}/metafields.json`;

    return getMetafieldsWithPaging(options, uri).then(metafields => {
      product.metafields = metafields;
      return product;
    });
  }))
}

function getMetafieldsWithPaging(options, uri, page = 1, result = []) {
  let pageSize = 250; //Max page size supported
  options.uri = `${uri}?page=${page}&limit=${pageSize}`;

  log(`Requesting [${options.method} ${options.uri}]`);

  return request(options).then(body => {
    result = result.concat(body.metafields);

    if (body.metafields.length === pageSize) {
      return getMetafieldsWithPaging(options, uri, ++page, result);
    } else {
      return result;
    }
  });
}

function logError(msg) {
  console.log("[error] " + msg);
}

function log(msg) {
  console.log("[info] " + msg);
}

module.exports.GetProductMatrixFromQuery = GetProductMatrixFromQuery;
