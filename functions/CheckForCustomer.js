let CheckForCustomer = function (ncUtil,
                                 channelProfile,
                                 flowContext,
                                 payload,
                                 callback) {

  log("Building response object...");
  let out = {
    ncStatusCode: null,
    payload: {},
    response: {}
  };

  let invalid = false;
  let invalidMsg = "";

  //If channelProfile does not contain channelSettingsValues, channelAuthValues or customerBusinessReferences, the request can't be sent
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
  } else if (!channelProfile.customerBusinessReferences) {
    invalid = true;
    invalidMsg = "channelProfile.customerBusinessReferences was not provided"
  } else if (!Array.isArray(channelProfile.customerBusinessReferences)) {
    invalid = true;
    invalidMsg = "channelProfile.customerBusinessReferences is not an array"
  } else if (channelProfile.customerBusinessReferences.length === 0) {
    invalid = true;
    invalidMsg = "channelProfile.customerBusinessReferences is empty"
  }

  //If a customer document was not passed in, the request is invalid
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

    let endPoint = "/admin/customers/search.json";

    let request = require('request');

    let queryParams = [];
    let url = channelProfile.channelSettingsValues.protocol + "://" + channelProfile.channelAuthValues.shop + endPoint;

    let busRefValues = [];
    let values = [];
    channelProfile.customerBusinessReferences.forEach(function (businessReference) {
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
          log("Do CheckForCustomer Callback");
          out.response.endpointStatusCode = response.statusCode;
          out.response.endpointStatusMessage = response.statusMessage;

          if (response.statusCode == 200) {
            if (body.customers && body.customers.length == 1) {
              let customer = {
                customer: body.customers[0]
              };
              out.ncStatusCode = 200;
              out.payload = {
                customerRemoteID: customer.customer.id,
                customerBusinessReference: extractBusinessReference(channelProfile.customerBusinessReferences, customer)
              };
            } else if (body.customers.length > 1) {
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
          logError("Do CheckForCustomer Callback error - " + error);
          out.ncStatusCode = 500;
          out.payload.error = error;
          callback(out);
        }
      });
    } catch (error) {
      logError("Exception occurred in CheckForCustomer - " + error);
      out.payload.error = {err: error, stack: error.stackTrace};
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

module.exports.CheckForCustomer = CheckForCustomer;
