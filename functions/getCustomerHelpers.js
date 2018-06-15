'use strict';

module.exports = {
  queryForCustomers
};

function queryForCustomers(uri, pageSize) {
  let options = {
    method: 'GET',
    uri: uri,
    resolveWithFullResponse: true
  };

  this.info(`Requesting [${options.method} ${options.uri}]`);

  return this.request(options).then(response => {
    let customers = response.body.customers || [];

    customers = customers.map(customer => {
      return {customer: customer};
    });

    return this.formatGetResponse(customers, pageSize, response.statusCode);
  }).catch(this.handleRejection);
}
