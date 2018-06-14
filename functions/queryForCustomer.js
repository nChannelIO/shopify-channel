module.exports = function (uri, pageSize) {
  let options = {
    method: 'GET',
    uri: uri,
    resolveWithFullResponse: true
  };

  this.info(`Requesting [${options.method} ${options.uri}]`);

  this.request(options).then(response => {
    let out = {
      endpointStatusCode: response.statusCode,
      payload: []
    };

    let body = response.body;

    if (body.customers && body.customers.length > 0) {
      body.customers.forEach(customer => {
        out.payload.push({customer: customer});
      });

      if (out.payload.length === pageSize) {
        out.statusCode = 206;
      } else {
        out.statusCode = 200;
      }
    } else {
      out.statusCode = 204;
    }

    return out;
  }).catch(this.requestErrors.RequestError, this.handleRequestError).catch(this.requestErrors.StatusCodeError, this.handleStatusCodeError);
};
