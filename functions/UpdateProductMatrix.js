'use strict';

let Promise = require('bluebird');
let request = require('request-promise');
let errors = require('request-promise/errors');
let extractBusinessReference = require('../util/extractBusinessReference');

let UpdateProductMatrix = function (ncUtil,
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
  } else if (!channelProfile.productBusinessReferences) {
    invalid = true;
    invalidMsg = "channelProfile.productBusinessReferences was not provided"
  } else if (!Array.isArray(channelProfile.productBusinessReferences)) {
    invalid = true;
    invalidMsg = "channelProfile.productBusinessReferences is not an array"
  } else if (channelProfile.productBusinessReferences.length === 0) {
    invalid = true;
    invalidMsg = "channelProfile.productBusinessReferences is empty"
  }

  //If a product document was not passed in, the request is invalid
  if (!payload) {
    invalid = true;
    invalidMsg = "payload was not provided"
  } else if (!payload.doc) {
    invalid = true;
    invalidMsg = "payload.doc was not provided";
  } else if (!payload.productRemoteID) {
    invalid = true;
    invalidMsg = "payload.productRemoteID was not provided";
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

    // Get the variant id
    options.method = 'GET';
    options.uri = baseURI + `/admin/products/${payload.productRemoteID}/variants.json`;

    log(`Requesting [${options.method} ${options.uri}]`);

    request(options).then(body => {
      // Enrich variants with their id
      payload.doc.product.variants.forEach(variant => {
        let match = body.variants.find(element => element.sku = variant.sku);
        if (match) {
          variant.id = match.id;
        }
      });
    }).then(() => {
      return Promise.all([
        updateProductMetafields(payload, options, baseURI),
        updateVariantMetafields(payload, options, baseURI)
      ]).then(() => {
        // Update the product
        payload.doc.product.id = payload.productRemoteID;

        // Remove all metafields
        delete payload.doc.product.metafields;
        payload.doc.product.variants.forEach(variant => {
          delete variant.metafields;
        });

        options.uri = baseURI + `/admin/products/${payload.productRemoteID}.json`;
        options.method = 'PUT';
        options.body = payload.doc;
        options.resolveWithFullResponse = true;

        log(`Requesting [${options.method} ${options.uri}]`);

        return request(options).then(response => {
          log("Do UpdateProduct Callback");

          let body = response.body;
          out.response.endpointStatusCode = response.statusCode;
          out.response.endpointStatusMessage = response.statusMessage;
          out.payload = {
            doc: body,
            productBusinessReference: extractBusinessReference(channelProfile.productBusinessReferences, body)
          };

          out.ncStatusCode = 200;
        });
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
    log("Callback with an invalid request - " + invalidMsg);
    out.ncStatusCode = 400;
    out.payload.error = invalidMsg;
    callback(out);
  }
};

function getMetafieldsWithPaging(options, uri, page = 1, result = []) {
  let pageSize = 250; //Max page size supported
  options.method = 'GET';
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

function updateProductMetafields(payload, options, baseURI) {
  // Update product metafields
  if (payload.doc.product.metafields && payload.doc.product.metafields.length > 0) {
    // Get existing product metafields
    let uri = baseURI + `/admin/products/${payload.productRemoteID}/metafields.json`;

    return getMetafieldsWithPaging(options, uri).then(metafields => {
      // Determine which metafields need updated/inserted
      return payload.doc.product.metafields.reduce((metafieldsForUpdate, metafield) => {
        let match = false;

        // Loop through all existing metafields looking for a match
        for (let i = 0; i < metafields.length; i++) {
          let existingMetafield = metafields[i];
          if (metafield.namespace === existingMetafield.namespace && metafield.key === existingMetafield.key) {
            // It's a match
            match = true;
            // Remove it to speed up future iterations
            metafields.splice(i, 1);

            if (metafield.value !== existingMetafield.value || metafield.value_type !== existingMetafield.value_type || metafield.description !== existingMetafield.description) {
              // It needs updated
              metafield.id = existingMetafield.id;
              metafieldsForUpdate.push(metafield);
            }
            break;
          }
        }

        if (!match) {
          // It needs inserted
          metafieldsForUpdate.push(metafield);
        }

        return metafieldsForUpdate;
      }, []);
    }).then(metafields => {
      // Update the metafields
      return Promise.all(metafields.map(metafield => {
        if (metafield.id) {
          // Update existing metafield
          options.uri = baseURI + `/admin/products/${payload.productRemoteID}/metafields/${metafield.id}.json`;
          options.method = 'PUT';
          options.body = {metafield: metafield};

          log(`Requesting [${options.method} ${options.uri}]`);

          return request(options);
        } else {
          // Insert new metafield
          options.uri = baseURI + `/admin/products/${payload.productRemoteID}/metafields.json`;
          options.method = 'POST';
          options.body = {metafield: metafield};

          log(`Requesting [${options.method} ${options.uri}]`);

          return request(options);
        }
      }));
    });
  } else {
    return Promise.resolve();
  }
}

function updateVariantMetafields(payload, options, baseURI) {
  // Update variant metafields
  return Promise.all(payload.doc.product.variants.map(variant => {
  if (variant.id && variant.metafields && variant.metafields.length > 0) {
    // Get existing variant metafields
    let uri = baseURI + `/admin/products/${payload.productRemoteID}/variants/${variant.id}/metafields.json`;

    return getMetafieldsWithPaging(options, uri).then(metafields => {
      // Determine which metafields need updated/inserted
      return variant.metafields.reduce((metafieldsForUpdate, metafield) => {
        let match = false;

        // Loop through all existing metafields looking for a match
        for (let i = 0; i < metafields.length; i++) {
          let existingMetafield = metafields[i];
          if (metafield.namespace === existingMetafield.namespace && metafield.key === existingMetafield.key) {
            // It's a match
            match = true;
            // Remove it to speed up future iterations
            metafields.splice(i, 1);

            if (metafield.value !== existingMetafield.value || metafield.value_type !== existingMetafield.value_type || metafield.description !== existingMetafield.description) {
              // It needs updated
              metafield.id = existingMetafield.id;
              metafieldsForUpdate.push(metafield);
            }
            break;
          }
        }

        if (!match) {
          // It needs inserted
          metafieldsForUpdate.push(metafield);
        }

        return metafieldsForUpdate;
      }, []);
    }).then(metafields => {
      // Update the metafields
      return Promise.all(metafields.map(metafield => {
        if (metafield.id) {
          // Update existing metafield
          options.uri = baseURI + `/admin/products/${payload.productRemoteID}/variants/${variant.id}/metafields/${metafield.id}.json`;
          options.method = 'PUT';
          options.body = {metafield: metafield};

          log(`Requesting [${options.method} ${options.uri}]`);

          return request(options);
        } else {
          // Insert new metafield
          options.uri = baseURI + `/admin/products/${payload.productRemoteID}/variants/${variant.id}/metafields.json`;
          options.method = 'POST';
          options.body = {metafield: metafield};

          log(`Requesting [${options.method} ${options.uri}]`);

          return request(options);
        }
      }));
    });
  } else {
    return Promise.resolve();
  }
  }));
}

function logError(msg) {
  console.log("[error] " + msg);
}

function log(msg) {
  console.log("[info] " + msg);
}

module.exports.UpdateProductMatrix = UpdateProductMatrix;
