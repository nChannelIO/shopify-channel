let salesOrder = require('./GetSalesOrderFromQuery');
let _ = require('lodash');

let InsertFulfillment = function (ncUtil,
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
    invalidMsg = "channelProfile.fulfillmentBusinessReferences must be an array"
  } else if (channelProfile.fulfillmentBusinessReferences.length === 0) {
    invalid = true;
    invalidMsg = "channelProfile.fulfillmentBusinessReferences is empty"
  } else if (!channelProfile.salesOrderBusinessReferences) {
    invalid = true;
    invalidMsg = "channelProfile.salesOrderBusinessReferences was not provided"
  } else if (!Array.isArray(channelProfile.salesOrderBusinessReferences)) {
    invalid = true;
    invalidMsg = "channelProfile.salesOrderBusinessReferences must be an array"
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
  } else if (!payload.doc.fulfillment) {
    invalid = true;
    invalidMsg = "payload.doc.fulfillment was not provided";
  } else if (payload.doc.fulfillment.line_items) {
    if (!Array.isArray(payload.doc.fulfillment.line_items)) {
      invalid = true;
      invalidMsg = "payload.doc.fulfillment.line_items must be an array";
    } else if (payload.doc.fulfillment.line_items.length === 0) {
      invalid = true;
      invalidMsg = "payload.doc.fulfillment.line_items must not be empty";
    } else {
      for (let i = 0; i < payload.doc.fulfillment.line_items.length; i++) {
        if (!payload.doc.fulfillment.line_items[i].sku) {
          invalid = true;
          invalidMsg = "payload.doc.fulfillment.line_items[" + i + "] must contain a sku";
          break;
        }
      }
    }
  }

  //If callback is not a function
  if (!callback) {
    throw new Error("A callback function was not provided");
  } else if (typeof callback !== 'function') {
    throw new TypeError("callback is not a function")
  }

  if (!invalid) {
    //First get the corresponding sales order
    let queryPayload = {
      doc: {
        remoteIDs: [payload.salesOrderRemoteID],
        page: 1,
        pageSize: 2  //Using page size 2 so that GetSalesOrder will return 206 if more than one order is returned
      }
    };
    salesOrder.GetSalesOrderFromQuery(ncUtil, channelProfile, flowContext, queryPayload, function (getSalesOrderResponse) {
      if (getSalesOrderResponse.ncStatusCode === 200) {
        //---Update the fulfillment document---

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

        // Do line item based fulfillment?
        if (payload.doc.fulfillment.line_items) {

          let matchProperty = 'sku';
          let salesOrderLineItems = _.cloneDeep(getSalesOrderResponse.payload[0].doc.order.line_items);
          let correspondingLineItem;

          //Update the fulfillment line items based on the sales order
          payload.doc.fulfillment.line_items = payload.doc.fulfillment.line_items.reduce(function (lineItems, fulfillmentLineItem) {
            correspondingLineItem = false;

            //Loop through all SO line items looking for matching FUL line items -- there may be more than one
            for (let i = 0; i < salesOrderLineItems.length; i++) {
              if (fulfillmentLineItem[matchProperty] === salesOrderLineItems[i][matchProperty] && salesOrderLineItems[i].fulfillable_quantity > 0) {
                //Found a corresponding SO line item
                fulfillmentLineItem.id = salesOrderLineItems[i].id;
                correspondingLineItem = true;

                if (fulfillmentLineItem.quantity) {
                  //If the FUL line item quantity is greater than the SO line item quantity,
                  // split this FUL line item and update the quantity
                  if (fulfillmentLineItem.quantity > salesOrderLineItems[i].fulfillable_quantity) {
                    let newLineItem = _.cloneDeep(fulfillmentLineItem);
                    newLineItem.quantity = salesOrderLineItems[i].fulfillable_quantity;
                    fulfillmentLineItem.quantity -= salesOrderLineItems[i].fulfillable_quantity;
                    salesOrderLineItems[i].fulfillable_quantity = 0;
                    lineItems.push(newLineItem);

                  } else {
                    //Update the SO line item quantity and exit the loop
                    //This FUL line item should not be compared with other SO line items
                    salesOrderLineItems[i].fulfillable_quantity -= fulfillmentLineItem.quantity;
                    break;
                  }

                } else {
                  //No quantity provided -- Shopify will fulfill all remaining quantity
                  //Copy the line item an continue through the loop
                  salesOrderLineItems[i].fulfillable_quantity = 0;
                  lineItems.push(_.cloneDeep(fulfillmentLineItem));
                }
              }
            }

            //Add the FUL line item, this may be a partial fulfillment or leftover qty (let Shopify decide how to handle these)
            if (fulfillmentLineItem.quantity) {
              lineItems.push(fulfillmentLineItem);
            }

            if (!correspondingLineItem) {
              invalid = true;
              invalidMsg = "fulfillment line item does not have a corresponding sales order line item";
            }
            return lineItems;
          }, []);

          //In the case of leftover qty there are line items with duplicate IDs, condense them
          for (let i = 0; i < payload.doc.fulfillment.line_items.length; i++) {
            for (let j = i + 1; j < payload.doc.fulfillment.line_items.length;) {
              if (payload.doc.fulfillment.line_items[i].id === payload.doc.fulfillment.line_items[j].id) {
                payload.doc.fulfillment.line_items[i].quantity += payload.doc.fulfillment.line_items[j].quantity;
                payload.doc.fulfillment.line_items.splice(j, 1);
              } else {
                j++;
              }
            }
          }

        }
        //---Done updating the fulfillment document---

        if (!invalid) {
          //Insert the fulfillment
          let endPoint = "/admin/orders/" + payload.salesOrderRemoteID + "/fulfillments.json";

          let request = require('request');

          let url = channelProfile.channelSettingsValues.protocol + "://" + channelProfile.channelAuthValues.shop + endPoint;

          /*
           Format url
           */
          let headers = {
            "X-Shopify-Access-Token": channelProfile.channelAuthValues.access_token
          };

          log("Using URL [" + url + "]");

          /*
           Set URL and headers
           */
          let options = {
            url: url,
            method: "POST",
            headers: headers,
            body: payload.doc,
            json: true
          };

          try {
            // Pass in our URL and headers
            request(options, function (error, response, body) {
              if (!error) {
                log("Do InsertFulfillment Callback");
                out.response.endpointStatusCode = response.statusCode;
                out.response.endpointStatusMessage = response.statusMessage;

                // If we have a fulfillment object, set out.payload.doc to be the fulfillment document
                if (response.statusCode === 201 && body.fulfillment) {
                  out.payload = {
                    doc: body,
                    fulfillmentRemoteID: body.fulfillment.id,
                    fulfillmentBusinessReference: fulfillmentBusinessReference,
                    salesOrderRemoteID: payload.salesOrderRemoteID
                  };

                  out.ncStatusCode = 201;
                } else if (response.statusCode === 429) {
                  out.ncStatusCode = 429;
                  out.payload.error = body;
                } else if (response.statusCode === 500) {
                  out.ncStatusCode = 500;
                  out.payload.error = body;
                } else {
                  out.ncStatusCode = 400;
                  out.payload.error = body;
                }
                callback(out);
              } else {
                logError("Do InsertFulfillment Callback error - " + error);
                out.payload.error = error;
                out.ncStatusCode = 500;
                callback(out);
              }
            });
          } catch (err) {
            logError("Exception occurred in InsertFulfillment - " + err);
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
      } else {
        if (getSalesOrderResponse.ncStatusCode === 204) {
          getSalesOrderResponse.ncStatusCode = 400;
          getSalesOrderResponse.payload.error = "unable to retrieve the corresponding sales order";
        } else if (getSalesOrderResponse.ncStatusCode === 206) {
          getSalesOrderResponse.ncStatusCode = 400;
          getSalesOrderResponse.payload.error = "salesOrderRemoteID does not map to a unique sales order -- more than one found";
        }
        callback(getSalesOrderResponse);
      }
    });
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

module.exports.InsertFulfillment = InsertFulfillment;
