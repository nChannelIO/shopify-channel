let UpdateFulfillment = function (ncUtil,
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
  } else if (!channelProfile.salesOrderBusinessReferences) {
    invalid = true;
    invalidMsg = "channelProfile.salesOrderBusinessReferences was not provided"
  } else if (!Array.isArray(channelProfile.salesOrderBusinessReferences)) {
    invalid = true;
    invalidMsg = "channelProfile.salesOrderBusinessReferences is not an array"
  } else if (channelProfile.salesOrderBusinessReferences.length === 0) {
    invalid = true;
    invalidMsg = "channelProfile.salesOrderBusinessReferences is empty"
  }
  
  //If a fulfillment document was not passed in, the request is invalid
  if (!payload) {
    invalid = true;
    invalidMsg = "payload was not provided"
  } else if (!payload.doc) {
    invalid = true;
    invalidMsg = "payload.doc was not provided";
  } else if (!payload.salesOrderRemoteID) {
    invalid = true;
    invalidMsg = "payload.salesOrderRemoteID was not provided";
  } else if (!payload.fulfillmentRemoteID) {
    invalid = true;
    invalidMsg = "payload.fulfillmentRemoteID was not provided";
  }
  
  //If callback is not a function
  if (!callback) {
    throw new Error("A callback function was not provided");
  } else if (typeof callback !== 'function') {
    throw new TypeError("callback is not a function")
  }
  
  if (!invalid) {
    let endPoint = "/admin/orders/" + payload.salesOrderRemoteID + "/fulfillments/" + payload.fulfillmentRemoteID + ".json";
    
    let request = require('request');
    
    let url = channelProfile.channelSettingsValues.protocol + "://" + channelProfile.channelAuthValues.shop + endPoint;
    
    /*
     Format url
     */
    let headers = {
      "X-Shopify-Access-Token": channelProfile.channelAuthValues.access_token
    };
    
    log("Using URL [" + url + "]", ncUtil);
  
    payload.doc.fulfillment.order_id = payload.salesOrderRemoteID;
    payload.doc.fulfillment.id = payload.fulfillmentRemoteID;
  
    //Remove the sales order synthetic business reference from the fulfillment
    channelProfile.salesOrderBusinessReferences.forEach(function (businessReference) {
      removeReference(businessReference, payload.doc);
    });
  
    //Remove the fulfillment synthetic business reference from the fulfillment and store it so it can be returned
    let values = [];
    channelProfile.fulfillmentBusinessReferences.forEach(function (businessReference) {
      values.push(removeReference(businessReference, payload.doc));
    });
    let fulfillmentBusinessReference = values.join('.');
  
    //Remove line_items since they can not be updated
    removeReference('fulfillment.line_items', payload.doc);
    
    /*
     Set URL and headers
     */
    let options = {
      url: url,
      method: "PUT",
      headers: headers,
      body: payload.doc,
      json: true
    };
    
    try {
      // Pass in our URL and headers
      request(options, function (error, response, body) {
        if (!error) {
          log("Do UpdateFulfillment Callback", ncUtil);
          out.response.endpointStatusCode = response.statusCode;
          out.response.endpointStatusMessage = response.statusMessage;
          
          // If we have a fulfillment object, set out.payload.doc to be the fulfillment document
          if (body.fulfillment) {
            out.payload = {
              doc: body,
              fulfillmentBusinessReference: fulfillmentBusinessReference
            };
            
            out.ncStatusCode = 200;
          } else if (response.statusCode == 429) {
            out.ncStatusCode = 429;
            out.payload.error = body;
          } else if (response.statusCode == 500) {
            out.ncStatusCode = 500;
            out.payload.error = body;
          } else {
            out.ncStatusCode = 400;
            out.payload.error = body;
          }
          
          callback(out);
        } else {
          logError("Do UpdateFulfillment Callback error - " + error, ncUtil);
          out.payload.error = error;
          out.ncStatusCode = 500;
          callback(out);
        }
      });
    } catch (err) {
      logError("Exception occurred in UpdateFulfillment - " + err, ncUtil);
      out.payload.error = {err: err, stack: err.stackTrace};
      out.ncStatusCode = 500;
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

function removeReference(path, doc) {
  if (typeof path === 'string') {
    return removeReference(path.split('.'), doc);
  } else if (!doc) {
    return undefined;
  } else if (path.length === 1) {
    let value = doc[path[0]];
    delete doc[path[0]];
    return value;
  } else {
    return removeReference(path.splice(1), doc[path[0]]);
  }
}

module.exports.UpdateFulfillment = UpdateFulfillment;
