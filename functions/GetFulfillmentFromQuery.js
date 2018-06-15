'use strict';

module.exports = function (flowContext, payload) {

  //TODO GET FULFILLMENT REQUIRES AN ORDER ID

  let queryParams = [];

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

  let options = {
    method: 'GET',
    url: `${this.baseUri}/admin/orders/${payload.salesOrderRemoteID}/fulfillments.json`,
  };


  return this.request(options).then(response => {
    let fulfillments = response.body.fulfillments || [];

    fulfillments = fulfillments.map(fulfillment => {
      return {fulfillment: fulfillment};
    });

    return this.formatGetResponse(fulfillments, undefined, response.statusCode);
  }).catch(this.handleRejection.bind(this));
};

