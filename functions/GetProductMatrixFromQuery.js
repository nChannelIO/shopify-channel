let GetProductMatrixFromQuery = function (ncUtil,
                                          channelProfile,
                                          flowContext,
                                          payload,
                                          callback) {
  
  log("Building response object...", ncUtil);
  let out = {
    ncStatusCode: null,
    response: {},
    payload: {}
  };
  
  let invalid = false;
  let invalidMsg = "";
  
  //If ncUtil does not contain a request object, the request can't be sent
  if (!ncUtil) {
    invalid = true;
    invalidMsg = "ncUtil was not provided"
  } else if (!ncUtil.request) {
    invalid = true;
    invalidMsg = "ncUtil.request was not provided"
  }
  
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
    
    let request = require('request');
    
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
    
    
    /*
     Format url
     */
    let headers = {
      "X-Shopify-Access-Token": channelProfile.channelAuthValues.access_token
    };
    
    url += "?" + queryParams.join('&');
    
    log("Using URL [" + url + "]", ncUtil);
    
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
          log("Do GetProductMatrixFromQuery Callback", ncUtil);
          out.response.endpointStatusCode = response.statusCode;
          out.response.endpointStatusMessage = response.statusMessage;
          
          // Parse data
          let docs = [];
          let data = body;
          
          if (response.statusCode === 200) {
            // If we have an array of products, set out.payload to be the array of products returned
            if (data.products && data.products.length > 0) {
              for (let i = 0; i < data.products.length; i++) {
                let product = {
                  product: body.products[i]
                };
                docs.push({
                  doc: product,
                  productMatrixRemoteID: product.product.id,
                  productMatrixBusinessReference: extractBusinessReference(channelProfile.productMatrixBusinessReferences, product)
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
          logError("Do GetProductMatrixFromQuery Callback error - " + error, ncUtil);
          out.ncStatusCode = 500;
          out.payload.error = {err: error};
          callback(out);
        }
      });
    } catch (err) {
      logError("Exception occurred in GetProductMatrixFromQuery - " + err, ncUtil);
      out.ncStatusCode = 500;
      out.payload.error = {err: err, stack: err.stackTrace};
      callback(out);
    }
  } else {
    log("Callback with an invalid request - " + invalidMsg, ncUtil);
    out.ncStatusCode = 400;
    out.payload.error = invalidMsg;
    callback(out);
  }
};

function logError(msg, ncUtil) {
  console.log("[error] " + msg);
}

function log(msg, ncUtil) {
  console.log("[info] " + msg);
}

module.exports.GetProductMatrixFromQuery = GetProductMatrixFromQuery;
