'use strict';

module.exports = function (flowContext, query) {

  //TODO GET FULFILLMENT REQUIRES AN ORDER ID

  let queryParams = [];

  /*
   Create query string for searching fulfillments by specific fields
   */
  if (query.remoteIDs) {
    /*
     Add remote IDs as a query parameter
     */
    queryParams.push("ids=" + query.remoteIDs.join(','));

  } else if (query.modifiedDateRange) {
    /*
     Add modified date ranges to the query
     Queried dates are exclusive so skew by 1 ms to create and equivalent inclusive range
     */
    if (query.modifiedDateRange.startDateGMT) {
      queryParams.push("updated_at_min=" + new Date(Date.parse(query.modifiedDateRange.startDateGMT) - 1).toISOString());
    }
    if (query.modifiedDateRange.endDateGMT) {
      queryParams.push("updated_at_max=" + new Date(Date.parse(query.modifiedDateRange.endDateGMT) + 1).toISOString());
    }
  }

  /*
   Add page to the query
   */
  if (query.page) {
    queryParams.push("page=" + query.page);
  }

  /*
   Add pageSize (limit) to the query
   */
  if (query.pageSize) {
    queryParams.push("limit=" + query.pageSize);
  }

  let options = {
    method: 'GET',
    uri: `${this.baseUri}/admin/orders/${query.salesOrderRemoteID}/fulfillments.json`,
  };

  this.info(`Requesting [${options.method} ${options.uri}]`);

  return this.request(options).then(response => {
    let fulfillments = response.body.fulfillments || [];

    fulfillments = fulfillments.map(fulfillment => {
      return {fulfillment: fulfillment};
    });

    return this.formatGetResponse(fulfillments, undefined, response.statusCode);
  }).catch(this.handleRejection.bind(this));
};

