let ExtractCustomerAddressesFromCustomer = function(
    ncUtil,
    channelProfile,
    flowContext,
    payload,
    callback)
{

    log("Building callback object...");
    let out = {
        ncStatusCode: null,
        payload: {}
    };

    // Check callback
    if (!callback) {
        throw new Error("A callback function was not provided");
    } else if (typeof callback !== 'function') {
        throw new TypeError("callback is not a function")
    }

    try {
        let notFound = false;
        let invalid = false;
        let invalidMsg = "";
        let data = {};

        // Check ncUtil
        if (!ncUtil) {
            invalid = true;
            invalidMsg = "ExtractCustomerAddressesFromCustomer - Invalid Request: ncUtil was not passed into the function";
        }

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

        // Check Payload
        if (!invalid) {
          if (payload) {
              if (!payload.doc) {
                  invalidMsg = "Extract Customer Addresses From Customer - Invalid Request: payload.doc was not provided";
                  invalid = true;
              } else if (!payload.doc.Addresses || payload.doc.Addresses.length === 0) {
                  notFound = true;
                  invalidMsg = "Extract Customer Addresses From Customer - Addresses Not Found: The customer has no addresses (payload.doc.Addresses)";
              } else {
                  data = payload.doc.Addresses;
              }
          } else {
              invalidMsg = "Extract Customer Addresses From Customer - Invalid Request: payload was not provided";
              invalid = true;
          }
        }

        if (!invalid && !notFound) {
          // Customer Addresses Found
          out.payload = [];

          data.forEach((address) => {
              let payloadElement = {
                doc: address,
                customerRemoteID: payload.customerRemoteID,
                customerBusinessReference: payload.customerBusinessReference
              };
              out.payload.push(payloadElement);
          });

          out.ncStatusCode = 200;

          callback(out);
        } else if (!invalid && notFound){
          // Customer Addresses Not Found
          log(invalidMsg);
          out.ncStatusCode = 204;

          callback(out);
        } else {
          // Invalid Request (payload or payload.doc was not passed in)
          log(invalidMsg);
          out.ncStatusCode = 400;
          out.payload.error = { err: invalidMsg };

          callback(out);
        }
    } catch (err) {
        logError("Exception occurred in ExtractCustomerAddressesFromCustomer - " + err);
        out.ncStatusCode = 500;
        out.payload.error = { err: err.message, stackTrace: err.stackTrace };
        callback(out);
    }

}

function logError(msg) {
    console.log("[error] " + msg);
}

function log(msg) {
    console.log("[info] " + msg);
}
module.exports.ExtractCustomerAddressesFromCustomer = ExtractCustomerAddressesFromCustomer;
