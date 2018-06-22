'use strict';

let _ = require('lodash');

module.exports = function (flowContext, payload) {

  //First get the corresponding sales order
  let queryPayload = {
    doc: {
      remoteIDs: [payload.salesOrderRemoteID],
      page: 1,
      pageSize: 2  //Using page size 2 so that GetSalesOrder will return 206 if more than one order is returned
    }
  };

  let invalid;
  let invalidMsg;
  let fulfillment = payload.doc.fulfillment;

  return this.getSalesOrderById(flowContext, queryPayload).then(getSalesOrderResponse => {
    if (getSalesOrderResponse.statusCode === 200) {
      //---Update the fulfillment document---
      delete fulfillment.fulfillment_business_ref;
      delete fulfillment.sales_order_business_ref;

      // Do line item based fulfillment?
      if (fulfillment.line_items) {

        let matchProperty = 'sku';
        let salesOrderLineItems = _.cloneDeep(getSalesOrderResponse.payload[0].order.line_items);
        let correspondingLineItem;

        //Update the fulfillment line items based on the sales order
        fulfillment.line_items = fulfillment.line_items.reduce(function (lineItems, fulfillmentLineItem) {
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
            invalidMsg = `A fulfillment line_item does not have a corresponding sales order line item`;
          }
          return lineItems;
        }, []);

        //In the case of leftover qty there are line items with duplicate IDs, condense them
        for (let i = 0; i < fulfillment.line_items.length; i++) {
          for (let j = i + 1; j < fulfillment.line_items.length;) {
            if (fulfillment.line_items[i].id === fulfillment.line_items[j].id) {
              fulfillment.line_items[i].quantity += fulfillment.line_items[j].quantity;
              fulfillment.line_items.splice(j, 1);
            } else {
              j++;
            }
          }
        }

      }
      //---Done updating the fulfillment document---

      if (!invalid) {
        let options = {
          url: `${this.baseUri}/admin/orders/${payload.salesOrderRemoteID}/fulfillments.json`,
          method: "POST",
          body: payload.doc,
          resolveWithFullResponse: true
        };

        return this.request(options).then(response => {
          return {
            endpointStatusCode: response.statusCode,
            payload: response.body,
            statusCode: 201
          };
        });

      } else {
        this.warn(`The fulfillment is invalid: ${invalidMsg}`);
        return {
          endpointStatusCode: 'N/A',
          statusCode: 400,
          errors: [invalidMsg]
        };
      }
    } else {
      if (getSalesOrderResponse.statusCode === 204) {
        getSalesOrderResponse.statusCode = 400;
        getSalesOrderResponse.errors = ["unable to retrieve the corresponding sales order"];
      } else if (getSalesOrderResponse.statusCode === 206) {
        getSalesOrderResponse.statusCode = 400;
        getSalesOrderResponse.errors = ["salesOrderRemoteID does not map to a unique sales order -- more than one found"];
      }
      return getSalesOrderResponse;
    }
  }).catch(this.handleRejection.bind(this));
};
