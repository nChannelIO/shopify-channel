let Promise = require('bluebird');
let moment = require('moment');
let request = require('request-promise');
let _ = require('lodash');

let GetProductQuantityFromQuery = function (ncUtil,
                                          channelProfile,
                                          flowContext,
                                          payload,
                                          callback) {
  
  log("Building response object...");
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
  } else if (!payload.doc.remoteIDs && !payload.doc.searchFields && !payload.doc.modifiedDateRange) {
    invalid = true;
    invalidMsg = "either payload.doc.remoteIDs or payload.doc.searchFields or payload.doc.modifiedDateRange must be provided"
  } else if (payload.doc.remoteIDs && (payload.doc.searchFields || payload.doc.modifiedDateRange)) {
    invalid = true;
    invalidMsg = "only one of payload.doc.remoteIDs or payload.doc.searchFields or payload.doc.modifiedDateRange may be provided"
  } else if (payload.doc.remoteIDs && (!Array.isArray(payload.doc.remoteIDs) || payload.doc.remoteIDs.length === 0)) {
    invalid = true;
    invalidMsg = "payload.doc.remoteIDs must be an Array with at least 1 remoteID"
  } else if (payload.doc.searchFields && (!Array.isArray(payload.doc.searchFields) || payload.doc.searchFields.length === 0)) {
    invalid = true;
    invalidMsg = "payload.doc.searchFields must be an Array with at least 1 key value pair: {searchField: 'key', searchValues: ['value_1']}"
  } else if (payload.doc.searchFields) {
    for (let i = 0; i < payload.doc.searchFields.length; i++) {
      if (!payload.doc.searchFields[i].searchField || !Array.isArray(payload.doc.searchFields[i].searchValues) || payload.doc.searchFields[i].searchValues.length === 0) {
        invalid = true;
        invalidMsg = "payload.doc.searchFields[" + i + "] must be a key value pair: {searchField: 'key', searchValues: ['value_1']}";
        break;
      }
    }
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
    const extractBusinessReference = require('../util/extractBusinessReference');
    
    let queryParams = [];
    
    let url = channelProfile.channelSettingsValues.protocol + "://" + channelProfile.channelAuthValues.shop + "/admin/products.json";
    
    if (payload.doc.searchFields) {
      let query = "query=";
      let fields = [];
      // Loop through each field
      payload.doc.searchFields.forEach(function (searchField) {
        let values = [];
        // Loop through each value
        searchField.searchValues.forEach(function (searchValue) {
          values.push(searchField.searchField + ":" + encodeURIComponent(searchValue));
        });
        // Multiple values use OR
        fields.push(values.join(" OR "));
      });
      // Multiple fields use AND
      query += fields.join(" AND ");
      queryParams.push(query);
      
      // admin/products/search.json endpoint for using the query
      url = url.substring(0, url.indexOf(".json")) + "/search.json";
      
    } else if (payload.doc.remoteIDs) {
      /*
       Add remote IDs as a query parameter
       */
      queryParams.push("ids=" + payload.doc.remoteIDs.join(','));
      
    } else if (payload.doc.modifiedDateRange) {
      /*
       Add modified date ranges to the query
       Queried dates are exclusive so skew by 1 ms to create and equivalent inclusive range
       */
      
      if (payload.doc.modifiedDateRange.startDateGMT) {
        queryParams.push("updated_at_min=" + new Date(Date.parse(payload.doc.modifiedDateRange.startDateGMT) - 1).toISOString());
      }
      if (payload.doc.modifiedDateRange.endDateGMT) {
        queryParams.push("updated_at_max=" + new Date(Date.parse(payload.doc.modifiedDateRange.endDateGMT) + 1).toISOString());
      }
    }
    
    /*
     Add page to the query
     */
    if (payload.doc.page) {
      queryParams.push("page=" + payload.doc.page);
    }
    
    /*
     Add pageSize (limit) to the query
     */
    if (payload.doc.pageSize) {
      queryParams.push("limit=" + payload.doc.pageSize);
    }
    
    
    // Set base uri and options
    let baseURI = channelProfile.channelSettingsValues.protocol + "://" + channelProfile.channelAuthValues.shop;
    let headers = {
      "X-Shopify-Access-Token": channelProfile.channelAuthValues.access_token
    };
    let options = {
      headers: headers,
      json: true,
      resolveWithFullResponse: true
    };

    // Get the variant id
    options.method = 'GET';
    options.uri = baseURI + `/admin/products.json?${queryParams.join('&')}`;

    log(`Requesting [${options.method} ${options.uri}]`);
    
    let productQuantities = [];

    request(options).then(response => {
      log("Do GetProductQuantityFromQuery Callback");
      out.response.endpointStatusCode = response.statusCode;
      out.response.endpointStatusMessage = response.statusMessage;

      let body = response.body;

      // If we have an array of products, set out.payload to be the array of products returned
      if (body.products && body.products.length > 0) {
        if (body.products.length === payload.doc.pageSize) {
          out.ncStatusCode = 206;
        } else {
          out.ncStatusCode = 200;
        }

        let startTime = moment(payload.doc.modifiedDateRange.startDateGMT);
        let endTime = moment(payload.doc.modifiedDateRange.endDateGMT);

        return Promise.all(body.products.map(product => {
          return Promise.all(product.variants.map(variant => {
            if (moment(variant.updated_at).isBetween(startTime, endTime, null, [])) {
              return variant.inventory_item_id;
            }
          }));
        })).then(inventory_item_ids =>{
          inventory_item_ids = inventory_item_ids.reduce((flattened, array) => {
            return flattened.concat(array);
          }, []);

          if (inventory_item_ids > 0) {
            inventory_item_ids = inventory_item_ids.join(',');

            return Promise.all([
              getInventoryItems(options, baseURI, inventory_item_ids),
              getInventoryLevels(options, baseURI, inventory_item_ids)
            ]).then(([inventoryItems, inventoryLevels]) => {
              inventoryItems.forEach(inventoryItem => {
                inventoryItem.inventory_levels = _.filter(inventoryLevels, {inventory_item_id: inventoryItem.id});
                if (inventoryItem.inventory_levels.some(element => moment(element.updated_at).isBetween(startTime, endTime, null, []))) {
                  productQuantities.push({
                    doc: inventoryItem,
                    productQuantityRemoteID: inventoryItem.id,
                    productQuantityBusinessReference: extractBusinessReference(channelProfile.productQuantityBusinessReferences, inventoryItem)
                  });
                }
              });
            });

          } else {
            out.ncStatusCode = 204;
            out.payload = [];
          }
        });
      } else {
        out.ncStatusCode = 204;
        out.payload = [];
      }

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
      try {
        if (out.ncStatusCode === 200 || out.ncStatusCode === 206) {
          if (productQuantities.length > payload.doc.pageSize) {
            for (let i = 0; i < productQuantities.length; i += payload.doc.pageSize) {
              let obj = _.cloneDeep(out);
              obj.payload = productQuantities.slice(i, i + payload.doc.pageSize);
              callback(obj);
            }
          } else {
            out.payload = productQuantities;
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

function getInventoryItems(options, baseURI, inventory_item_ids) {
  let newOptions = _.cloneDeep(options);
  newOptions.resolveWithFullResponse = false;
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
  newOptions.resolveWithFullResponse = false;
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
