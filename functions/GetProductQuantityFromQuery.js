'use strict';

let Promise = require('bluebird');
let moment = require('moment');
let request = require('request-promise');
let errors = require('request-promise/errors');
let _ = require('lodash');
const extractBusinessReference = require('../util/extractBusinessReference');

let GetProductQuantityFromQuery = function (ncUtil,
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
  
  //If channelProfile does not contain channelSettingsValues, channelAuthValues or productQuantityBusinessReference, the request can't be sent
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
  } else if (payload.doc.searchFields) {
    invalid = true;
    invalidMsg = "Searching for product quantities is not supported";
  } else if (!payload.doc.remoteIDs && !payload.doc.modifiedDateRange) {
    invalid = true;
    invalidMsg = "either payload.doc.remoteIDs or payload.doc.searchFields or payload.doc.modifiedDateRange must be provided"
  } else if (payload.doc.remoteIDs && (payload.doc.searchFields || payload.doc.modifiedDateRange)) {
    invalid = true;
    invalidMsg = "only one of payload.doc.remoteIDs or payload.doc.searchFields or payload.doc.modifiedDateRange may be provided"
  } else if (payload.doc.remoteIDs && (!Array.isArray(payload.doc.remoteIDs) || payload.doc.remoteIDs.length === 0)) {
    invalid = true;
    invalidMsg = "payload.doc.remoteIDs must be an Array with at least 1 remoteID"
  } else if (payload.doc.modifiedDateRange && !(payload.doc.modifiedDateRange.startDateGMT || payload.doc.modifiedDateRange.endDateGMT)) {
    invalid = true;
    invalidMsg = "at least one of payload.doc.modifiedDateRange.startDateGMT or payload.doc.modifiedDateRange.endDateGMT must be provided"
  } else if (payload.doc.modifiedDateRange && payload.doc.modifiedDateRange.startDateGMT && payload.doc.modifiedDateRange.endDateGMT && (payload.doc.modifiedDateRange.startDateGMT > payload.doc.modifiedDateRange.endDateGMT)) {
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
    // Set base uri and options
    let baseURI = channelProfile.channelSettingsValues.protocol + "://" + channelProfile.channelAuthValues.shop;
    let headers = {
      "X-Shopify-Access-Token": channelProfile.channelAuthValues.access_token
    };
    let options = {
      headers: headers,
      json: true
    };

    let promise;

    if (payload.doc.remoteIDs) {
      promise = getProductQuantityByIDs(options, baseURI, payload.doc.remoteIDs, payload.doc.page, payload.doc.pageSize).then(productQuantities => {
        let out = {
          ncStatusCode: productQuantities.length > 0 ? 200 : 204,
          response: {},
          payload: []
        };

        productQuantities.forEach(productQuantity => {
          out.payload.push({
            doc: productQuantity,
            productQuantityRemoteID: productQuantity.id,
            productQuantityBusinessReference: extractBusinessReference(channelProfile.productQuantityBusinessReferences, productQuantity)
          });
        });

        return out;
      });
    } else {
      promise = getProductQuantityByTimeRange(channelProfile, options, baseURI, payload.doc.modifiedDateRange.startDateGMT, payload.doc.modifiedDateRange.endDateGMT, payload.doc.page, payload.doc.pageSize);
    }

    promise.then(result => {
      out = result;
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
        if (out.ncStatusCode === 200 || out.ncStatusCode === 206) {
          // Split the payload into chunks of size pageSize
          if (out.payload.length > payload.doc.pageSize) {
            let productQuantities = out.payload;
            delete out.payload;
            for (let i = 0; i < productQuantities.length; i += payload.doc.pageSize) {
              let obj = _.cloneDeep(out);
              obj.payload = productQuantities.slice(i, i + payload.doc.pageSize);
              callback(obj);
            }
          } else {
            callback(out);
          }
        } else {
          callback(out);
        }
      } catch (err) {
       logError(err);
      }
    });
  } else {
    logError("Callback with an invalid request - " + invalidMsg);
    out.ncStatusCode = 400;
    out.payload.error = invalidMsg;
    callback(out);
  }
};

function getProductQuantityByIDs(options, baseURI, remoteIDs) {
  if (remoteIDs.length > 0) {
    remoteIDs = remoteIDs.join(',');

    return Promise.all([
      getInventoryItems(options, baseURI, remoteIDs),
      getInventoryLevels(options, baseURI, remoteIDs)
    ]).then(([inventoryItems, inventoryLevels]) => {
      inventoryItems.forEach(inventoryItem => {
        inventoryItem.inventory_levels = _.filter(inventoryLevels, {inventory_item_id: inventoryItem.id});
      });
      return inventoryItems;
    });

  } else {
    return [];
  }
}

function getProductQuantityByTimeRange(channelProfile, options, baseURI, startTime, endTime, page=1, pageSize=50) {
  let queryParams = [];
  //Queried dates are exclusive so skew by 1 ms to create an equivalent inclusive range
  if (startTime) {
    queryParams.push("updated_at_min=" + new Date(Date.parse(startTime) - 1).toISOString());
  }
  if (endTime) {
    queryParams.push("updated_at_max=" + new Date(Date.parse(endTime) + 1).toISOString());
  }

  //Add page and pageSize to the query
  queryParams.push("page=" + page);
  queryParams.push("limit=" + pageSize);

  /**
   * We cant query inventory items by their updated_at field. But when an
   * inventory item/level is updated the associated variant is also updated.
   * And when a variant is updated the associated product is also updated.
   *
   * So we'll do this instead.
   * 1) Get all products which were modified in the time range
   * 2) Filter out variants which were updated in the time range
   * 3) Get the associated inventory items and inventory levels
   * 4) Filter out inventory levels which were updated in the time range
   */

  // 1) Get all products which were modified in the time range
  options.method = 'GET';
  options.uri = baseURI + `/admin/products.json?${queryParams.join('&')}`;

  log(`Requesting [${options.method} ${options.uri}]`);

  let out = {
    ncStatusCode: null,
    response: {},
    payload: []
  };

  return request(options).then(body => {
    if (body.products && body.products.length > 0) {
      if (body.products.length === pageSize) {
        out.ncStatusCode = 206;
      }

      // 2) Filter out variants which were updated in the time range
      return Promise.all(body.products.map(product => {
        return Promise.all(product.variants.reduce((inventory_item_ids, variant) => {
          if (withinTimeRange(variant.updated_at, startTime, endTime)) {
            inventory_item_ids.push(variant.inventory_item_id);
          }
          return inventory_item_ids;
        }, []));
      })).then(inventory_item_ids => {
        inventory_item_ids = inventory_item_ids.reduce((flattened, array) => {
          return flattened.concat(array);
        }, []);

        // 3) Get the associated inventory items and inventory levels
        return getProductQuantityByIDs(options, baseURI, inventory_item_ids).then(productQuantities => {
          // 4) Filter out inventory levels which were updated in the time range
          return productQuantities.filter(productQuantity => {
            return productQuantity.inventory_levels.some(element => withinTimeRange(element.updated_at, startTime, endTime));
          });
        });
      });
    } else {
      return [];
    }
  }).then(productQuantities => {
    if (out.ncStatusCode !== 206) {
      out.ncStatusCode = productQuantities.length > 0 ? 200 : 204;
    }

    productQuantities.forEach(productQuantity => {
      out.payload.push({
        doc: productQuantity,
        productQuantityRemoteID: productQuantity.id,
        productQuantityBusinessReference: extractBusinessReference(channelProfile.productQuantityBusinessReferences, productQuantity)
      });
    });

    return out;
  });
}

function withinTimeRange(time, start, end) {
  if (!time || !(start || end)) {
    return false;
  }
  if (start && end) {
    return moment(time).isBetween(start, end, null, '[]');
  } else if (start) {
    return moment(time).isSameOrAfter(start);
  } else {
    return moment(time).isSameOrBefore(end);
  }
}

function getInventoryItems(options, baseURI, inventory_item_ids) {
  let newOptions = _.cloneDeep(options);
  newOptions.method = 'GET';
  let uri = `${baseURI}/admin/inventory_items.json?ids=${inventory_item_ids}`;
  return getInventoryItemsWithPaging(newOptions, uri);
}

function getInventoryItemsWithPaging(options, uri, page = 1, result = []) {
  let pageSize = 250; //Max page size supported
  options.uri = `${uri}&page=${page}&limit=${pageSize}`;

  log(`Requesting [${options.method} ${options.uri}]`);

  return request(options).then(body => {
    result = result.concat(body.inventory_items);

    if (body.inventory_items.length === pageSize) {
      return getInventoryItemsWithPaging(options, uri, ++page, result);
    } else {
      return result;
    }
  });
}

function getInventoryLevels(options, baseURI, inventory_item_ids) {
  let newOptions = _.cloneDeep(options);
  newOptions.method = 'GET';
  let uri = `${baseURI}/admin/inventory_levels.json?inventory_item_ids=${inventory_item_ids}`;
  return getInventoryLevelsWithPaging(newOptions, uri);
}

function getInventoryLevelsWithPaging(options, uri, page = 1, result = []) {
  let pageSize = 250; //Max page size supported
  options.uri = `${uri}&page=${page}&limit=${pageSize}`;

  log(`Requesting [${options.method} ${options.uri}]`);

  return request(options).then(body => {
    result = result.concat(body.inventory_levels);

    if (body.inventory_levels.length === pageSize) {
      return getInventoryLevelsWithPaging(options, uri, ++page, result);
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

module.exports.GetProductQuantityFromQuery = GetProductQuantityFromQuery;
