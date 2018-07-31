'use strict';

module.exports = function (flowContext, payload) {
  let fulfillment = payload.doc.fulfillment;

  // Save the synthetic business references so we can add them to the output doc
  let fulfillmentBusinessRef = fulfillment.fulfillment_business_ref;
  let salesOrderBusinessRef = fulfillment.sales_order_business_ref;

  // Delete synthetic businessReferences
  delete fulfillment.fulfillment_business_ref;
  delete fulfillment.sales_order_business_ref;

  // Delete line items since they can't be updated
  delete fulfillment.line_items;

  let options = {
    uri: `${this.baseUri}/admin/orders/${payload.salesOrderRemoteID}/fulfillments/${payload.fulfillmentRemoteID}.json`,
    method: "PUT",
    body: payload.doc,
    resolveWithFullResponse: true
  };

  this.info(`Requesting [${options.method} ${options.uri}]`);

  return this.request(options).then(response => {
    //Add the business references back into the document
    response.body.fulfillment.fulfillment_business_ref = fulfillmentBusinessRef;
    response.body.fulfillment.sales_order_business_ref = salesOrderBusinessRef;

    return {
      endpointStatusCode: response.statusCode,
      statusCode: 200,
      payload: response.body
    };
  }).catch(this.handleRejection.bind(this));
};
