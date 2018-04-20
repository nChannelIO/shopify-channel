let CheckForProductQuantity = function (ncUtil,
                                 channelProfile,
                                 flowContext,
                                 payload,
                                 callback) {
  
  log("Building response object...", ncUtil);
  let out = {
    ncStatusCode: null,
    payload: {},
    response: {}
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
  
  //If channelProfile does not contain channelSettingsValues, channelAuthValues or productQuantityBusinessReferences, the request can't be sent
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
  }
  
  //If callback is not a function
  if (!callback) {
    throw new Error("A callback function was not provided");
  } else if (typeof callback !== 'function') {
    throw new TypeError("callback is not a function")
  }
  
  
  if (!invalid) {
    const extractBusinessReference = require('../util/extractBusinessReference');
    const jsonata = require('jsonata');
    
    let endPoint = "/admin/variants/search.json";
    
    let request = require('request');
    
    let queryParams = [];
    let url = channelProfile.channelSettingsValues.protocol + "://" + channelProfile.channelAuthValues.shop + endPoint;
    
    let busRefValues = [];
    let values = [];
    channelProfile.productQuantityBusinessReferences.forEach(function (businessReference) {
      let expression = jsonata(businessReference);
      let value = expression.evaluate(payload.doc);
      if (value) {
        let lookup = businessReference.split('.').pop() + ":" + encodeURIComponent(value);
        values.push(lookup);
        busRefValues.push(value);
      }
    });
    let query = values.join(" AND ");
    let lookup = "query=" + query;
    queryParams.push(lookup);
    
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
          log("Do CheckForProductQuantity Callback", ncUtil);
          out.response.endpointStatusCode = response.statusCode;
          out.response.endpointStatusMessage = response.statusMessage;
          
          if (response.statusCode == 200) {
            if (body.variants && body.variants.length == 1) {
              let variant = {
                variant: body.variants[0]
              };
              out.ncStatusCode = 200;
              out.payload = {
                productQuantityRemoteID: variant.variant.id,
                productQuantityBusinessReference: extractBusinessReference(channelProfile.productQuantityBusinessReferences, variant)
              };
            } else if (body.variants.length > 1) {
              out.ncStatusCode = 409;
              out.payload.error = body;
            } else {
              out.ncStatusCode = 204;
            }
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
          logError("Do CheckForProductQuantity Callback error - " + error, ncUtil);
          out.ncStatusCode = 500;
          out.payload.error = error;
          callback(out);
        }
      });
    } catch (error) {
      logError("Exception occurred in CheckForProductQuantity - " + error, ncUtil);
      out.payload.error = {err: error, stack: error.stackTrace};
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

module.exports.CheckForProductQuantity = CheckForProductQuantity;
