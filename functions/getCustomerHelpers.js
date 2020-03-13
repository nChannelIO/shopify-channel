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
console.log(JSON.stringify(response,null,2));
    return this.formatGetResponse(customers, response, response.statusCode);
  }).catch(this.handleRejection.bind(this));
}
