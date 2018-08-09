'use strict';

module.exports = function (flowContext, payload) {
  return Promise.all([
      this.updateProductMetafields(payload),
      this.updateVariantMetafields(payload)
    ]).then(() => {
    // Save the metafields so they can be added to the output doc
    let productMetafields = payload.doc.product.metafields;

    // Remove all metafields
    delete payload.doc.product.metafields;
    payload.doc.product.variants.forEach(variant => {
      if (variant.hasOwnProperty('id')) {
        delete variant.metafields;
      }
    });

    let options = {
      uri: `${this.baseUri}/admin/products/${payload.productRemoteID}.json`,
      method: "PUT",
      body: payload.doc,
      resolveWithFullResponse: true
    };

    this.info(`Requesting [${options.method} ${options.uri}]`);

    return this.request(options).then(response => {
      let errors = [];

      //Add the product metafields back on the product
      response.body.product.metafields = productMetafields;

      // Get all the variant metafields
      return Promise.all(response.body.product.variants.map(variant => {
        let uri = `${this.baseUri}/admin/products/${payload.productRemoteID}/variants/${variant.id}/metafields.json`;
        return this.getMetafieldsWithPaging(uri).then(metafields => {
          variant.metafields = metafields;
        }).catch(() => {
          errors.push(`Unable to retrieve metafields for variant ${variant.id}.`)
        });
      })).then(() => {

        // Create the output message
        let out = {
          endpointStatusCode: response.statusCode,
          statusCode: 200,
          payload: response.body
        };
        if (errors.length > 0) {
          out.errors = errors;
        }
        return out;
      });
    });
  }).catch(this.handleRejection.bind(this))
};
