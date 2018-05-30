let GetFulfillmentFromQuery = function (ncUtil,
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
  
  //If channelProfile does not contain channelSettingsValues, channelAuthValues or fulfillmentBusinessReferences, the request can't be sent
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
  } else if (!channelProfile.fulfillmentBusinessReferences) {
    invalid = true;
    invalidMsg = "channelProfile.fulfillmentBusinessReferences was not provided"
  } else if (!Array.isArray(channelProfile.fulfillmentBusinessReferences)) {
    invalid = true;
    invalidMsg = "channelProfile.fulfillmentBusinessReferences is not an array"
  } else if (channelProfile.fulfillmentBusinessReferences.length === 0) {
    invalid = true;
    invalidMsg = "channelProfile.fulfillmentBusinessReferences is empty"
  }
  
  //If a fulfillment document was not passed in, the request is invalid
  if (!payload) {
    invalid = true;
    invalidMsg = "payload was not provided"
  } else if (!payload.salesOrderRemoteID) {
    invalid = true;
    invalidMsg = "payload.salesOrderRemoteID was not provided"
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
    
    let endPoint = "/admin/orders/" + payload.salesOrderRemoteID + "/fulfillments.json";
    
    //Request - Simplified HTTP client
    let request = require('request');
    
    let queryParams = [];
    let url = channelProfile.channelSettingsValues.protocol + "://" + channelProfile.channelAuthValues.shop + endPoint;
    
    /*
     Create query string for searching fulfillments by specific fields
     */
    if (payload.doc.remoteIDs) {
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
    
    
    /*
     Format url
     */
    let headers = {
      "X-Shopify-Access-Token": channelProfile.channelAuthValues.access_token
    };
    
    url += "?" + queryParams.join('&');
    
    log("Using URL [" + url + "]");
    
    /*
     Set URL and headers
     */
    let options = {
      url: url,
      headers: headers,
      json: true
    };
    
    try {
      // Pass in our URL and headers
      request(options, function (error, response, body) {
        if (!error) {
          log("Do GetFulfillmentFromQuery Callback");
          out.response.endpointStatusCode = response.statusCode;
          out.response.endpointStatusMessage = response.statusMessage;
          
          // Parse data
          let docs = [];
          let data = body;
          
          if (response.statusCode === 200) {
            // If we have an array of fulfillments, set out.payload to be the array of fulfillment returned
            if (data.fulfillments && data.fulfillments.length > 0) {
              for (let i = 0; i < data.fulfillments.length; i++) {
                let fulfillment = {
                  fulfillment: data.fulfillments[i]
                };
                docs.push({
                  doc: fulfillment,
                  fulfillmentRemoteID: fulfillment.fulfillment.id,
                  fulfillmentBusinessReference: extractBusinessReference(channelProfile.fulfillmentBusinessReferences, fulfillment),
                  salesOrderRemoteID: payload.salesOrderRemoteID
                });
              }
              if (docs.length === payload.doc.pageSize) {
                out.ncStatusCode = 206;
              } else {
                out.ncStatusCode = 200;
              }
              out.payload = docs;
            } else {
              out.ncStatusCode = 204;
              out.payload = data;
            }
          } else if (response.statusCode === 429) {
            out.ncStatusCode = 429;
            out.payload.error = data;
          } else if (response.statusCode === 500) {
            out.ncStatusCode = 500;
            out.payload.error = data;
          } else {
            out.ncStatusCode = 400;
            out.payload.error = data;
          }
          
          callback(out);
        } else {
          logError("Do GetFulfillmentFromQuery Callback error - " + error);
          out.payload.error = error;
          out.ncStatusCode = 500;
          callback(out);
        }
      });
    } catch (err) {
      logError("Exception occurred in GetFulfillmentFromQuery - " + err);
      out.payload.error = {err: err, stack: err.stackTrace};
      out.ncStatusCode = 500;
      callback(out);
    }
  } else {
    log("Callback with an invalid request - " + invalidMsg);
    out.ncStatusCode = 400;
    out.payload.error = invalidMsg;
    callback(out);
  }
};

function logError(msg) {
  console.log("[error] " + msg);
}

function log(msg) {
  console.log("[info] " + msg);
}

module.exports.GetFulfillmentFromQuery = GetFulfillmentFromQuery;
