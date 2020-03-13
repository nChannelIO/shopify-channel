'use strict';

module.exports = {
  queryForCustomers
};

function queryForCustomers(uri) {
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

    return this.formatGetResponse(customers, response, response.statusCode);
  }).catch(this.handleRejection.bind(this));
}
