'use strict';

let Promise = require('bluebird');
let request = require('request-promise');
let errors = require('request-promise/errors');
let extractBusinessReference = require('../util/extractBusinessReference');

let UpdateProductQuantity = function (ncUtil,
                               channelProfile,
                               flowContext,
                               payload,
                               callback) {

  log("Do UpdateProductQuantity");
  let out = {
    ncStatusCode: null,
    response: {},
    payload: {}
  };
  
  let invalid = false;
  let invalidMsg = "";
  
  //If channelProfile does not contain channelSettingsValues, channelAuthValues or productBusinessReferences, the request can't be sent
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
  } else if (!channelProfile.productQuantityBusinessReferences) {
    invalid = true;
    invalidMsg = "channelProfile.productQuantityBusinessReferences was not provided"
  } else if (!Array.isArray(channelProfile.productQuantityBusinessReferences)) {
    invalid = true;
    invalidMsg = "channelProfile.productQuantityBusinessReferences is not an array"
  } else if (channelProfile.productQuantityBusinessReferences.length === 0) {
    invalid = true;
    invalidMsg = "channelProfile.productQuantityBusinessReferences is empty"
  }
  
  //If a product document was not passed in, the request is invalid
  if (!payload) {
    invalid = true;
    invalidMsg = "payload was not provided"
  } else if (!payload.doc) {
    invalid = true;
    invalidMsg = "payload.doc was not provided";
  } else if (!payload.productQuantityRemoteID) {
    invalid = true;
    invalidMsg = "payload.productQuantityRemoteID was not provided";
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
      headers: headers,
      json: true
    };

    return updateInventoryLevels(payload.doc.inventory_item.inventory_levels, options, baseURI).then(updatedInventoryLevels => {
      // Enrich the id
      payload.doc.inventory_item.id = payload.productQuantityRemoteID;

      return updateInventoryItem(payload.doc, options, baseURI).then(response => {
        out.response.endpointStatusCode = response.statusCode;
        out.response.endpointStatusMessage = response.statusMessage;

        // Add the updated inventory levels to the inventory item
        response.body.inventory_item.inventory_levels = updatedInventoryLevels;

        out.payload = {
          doc: response.body,
          productQuantityRemoteID: payload.productQuantityRemoteID,
          productQuantityBusinessReference: extractBusinessReference(channelProfile.productQuantityBusinessReferences, response.body)
        };

        out.ncStatusCode = 200;

      });
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
    }).finally(() => {
      // Prevent an unhandled promise rejection if an exception occurs in the callback TODO basic driver to support promises
      try {
        callback(out);
      } catch(err) {
        logError(err);
      }
    });
  } else {
    logError(`Function arguments are invalid: ${invalidMsg}`);
    out.ncStatusCode = 400;
    out.payload.error = invalidMsg;
    callback(out);
  }
};

function updateInventoryItem(inventoryItem, options, baseURI) {
  // Delete the inventory levels
  delete inventoryItem.inventory_item.inventory_levels;

  options.method = 'PUT';
  options.uri = `${baseURI}/admin/inventory_items/${inventoryItem.inventory_item.id}.json`;
  options.body = inventoryItem;
  options.resolveWithFullResponse = true;

  log(`Requesting [${options.method} ${options.uri}]`);

  return request(options);
}

function updateInventoryLevels(inventoryLevels, options, baseURI) {
  if (inventoryLevels) {
    options.method = 'POST';
    options.uri = `${baseURI}/admin/inventory_levels/set.json`;

    log(`Updating ${inventoryLevels.length} inventory levels`);
    log(`Requesting [${options.method} ${options.uri}]`);

    return Promise.all(inventoryLevels.map(inventoryLevel => {
      options.body = inventoryLevel;

      return request(options).then(body => body.inventory_level);
    }));
  } else {
    return Promise.resolve([]);
  }
}

function logError(msg) {
  console.log("[error] " + msg);
}

function log(msg) {
  console.log("[info] " + msg);
}

module.exports.UpdateProductQuantity = UpdateProductQuantity;
