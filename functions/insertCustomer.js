module.exports = function (flowContext, payload) {
  let options = {
    url: `${this.baseUri}/admin/customers.json`,
    method: "POST",
    body: payload.doc,
    resolveWithFullResponse: true
  };

  this.info(`Requesting [${options.method} ${options.uri}]`);

  this.request(options).then(response => {
    return {
      endpointStatusCode: response.statusCode,
      statusCode: 201,
      payload: response.body
    };
  }).catch(this.requestErrors.RequestError, this.handleRequestError).catch(this.requestErrors.StatusCodeError, this.handleStatusCodeError);
};
