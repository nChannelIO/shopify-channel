'use strict';

module.exports = function (flowContext, payload) {
  let options = {
    uri: `${this.baseUri}/admin/api/${this.apiVersion}/variants/${payload.productPricingRemoteID}.json`,
    method: "PUT",
    body: payload.doc,
    resolveWithFullResponse: true
  };

  this.info(`Requesting [${options.method} ${options.uri}]`);

  return this.request(options).then(response => {
    return {
      endpointStatusCode: response.statusCode,
      statusCode: 200,
      payload: response.body
    };
  }).catch(this.handleRejection.bind(this));
};
