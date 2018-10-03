'use strict';

module.exports = function (flowContext, payload) {
  // Update product metafields first. If it fails b/c the product doesn't exist => 404
  // Update variant metafields second. If it fails b/c the variant doesn't exist => 400
  //
  // We don't want the get variant metafileds call to run before the get
  // product metafields call and fail w/ 400 b/c the product doesn't exist

  return this.updateProductMetafields(payload).then(() => {
    return this.updateVariantMetafields(payload);
  }).then(() => {
    // Save the metafields so they can be added to the output doc
    let productMetafields = payload.doc.product.metafields;

    // Remove all metafields
    delete payload.doc.product.metafields;
    if (payload.doc.product.variants) {
      payload.doc.product.variants.forEach(variant => {
        if (variant.hasOwnProperty('id')) {
          delete variant.metafields;
        }
      });
    }

    let options = {
      uri: `${this.baseUri}/admin/products/${payload.productRemoteID}.json`,
      method: "PUT",
      body: payload.doc,
      resolveWithFullResponse: true
    };

    this.info(`Requesting [${options.method} ${options.uri}]`);

    return this.request(options).then(response => {
      //Add the product metafields back on the product
      response.body.product.metafields = productMetafields;

      return {
        endpointStatusCode: response.statusCode,
        statusCode: 200,
        payload: response.body
      };
    });
  }).catch(this.handleRejection.bind(this))
};
