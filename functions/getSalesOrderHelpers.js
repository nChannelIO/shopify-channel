'use strict';

module.exports = {
  queryForSalesOrders
};

function queryForSalesOrders(uri, pageSize) {
  let options = {
    method: 'GET',
    uri: uri,
    resolveWithFullResponse: true
  };

  this.info(`Requesting [${options.method} ${options.uri}]`);

  return this.request(options).then(response => {
    let salesOrders = response.body.orders || [];

    salesOrders = salesOrders.map(salesOrder => {
      return {salesOrder: salesOrder};
    });

    return this.formatGetResponse(salesOrders, pageSize, response.statusCode);
  }).catch(this.handleRejection.bind(this));
}
