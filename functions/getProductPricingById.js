'use strict';

module.exports = function (flowContext, payload) {
  let options = {
    method: 'GET',
    uri: uri
  };

  return Promise.all(payload.doc.remoteIDs.map(remoteID => {
    options.uri = `${this.baseUri}/admin/variants/${remoteID}.json`;

    this.info(`Requesting [${options.method} ${options.uri}]`);

    return request(options).then(body => {
      return this.mapVariantToPricing(body.variant);
    });
  })).then(productPricings => {
    return this.formatGetResponse(productPricings, payload.doc.pageSize, 200);
  }).catch(this.handleRejection);
};
