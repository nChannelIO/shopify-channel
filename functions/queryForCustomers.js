'use strict';

module.exports = function (uri, pageSize) {
  let options = {
    method: 'GET',
    uri: uri,
    resolveWithFullResponse: true
  };

  this.info(`Requesting [${options.method} ${options.uri}]`);

  this.request(options).then(response => {
    let customers = response.body.customers || [];

    customers = customers.map(customer => {
      return {customer: customer};
    });

    return this.formatGetResponse(customers, pageSize, response.statusCode);
  }).catch(this.requestErrors.RequestError, this.handleRequestError).catch(this.requestErrors.StatusCodeError, this.handleStatusCodeError).catch(this.handleOtherError);
};
