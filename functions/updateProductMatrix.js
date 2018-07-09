'use strict';

module.exports = function (flowContext, payload) {
  return Promise.all([
      this.updateProductMetafields(payload),
      this.updateVariantMetafields(payload)
    ]).then(() => {
    // Remove all metafields
    delete payload.doc.product.metafields;
    payload.doc.product.variants.forEach(variant => {
      delete variant.metafields;
    });

    let options = {
      uri: `${this.baseUri}/admin/products/${payload.productRemoteID}.json`,
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
      }
    });
  }).catch(this.handleRejection.bind(this))
};
