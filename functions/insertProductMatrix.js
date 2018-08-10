'use strict';

module.exports = function (flowContext, payload) {
  let options = {
    uri: `${this.baseUri}/admin/products.json`,
    method: "POST",
    body: payload.doc,
    resolveWithFullResponse: true
  };

  this.info(`Requesting [${options.method} ${options.uri}]`);

  return this.request(options).then(response => {
    let errors = [];

    //Add the metafields to the output document
    let uri = `${this.baseUri}/admin/products/${response.body.product.id}/metafields.json`;
    return this.getMetafieldsWithPaging(uri).then(metafields => {
      response.body.product.metafields = metafields;
    }).catch(() => {
      response.body.product.metafields = payload.doc.product.metafields;
      errors.push(`Unable to retrieve the product's metafields. Using metafields from the input.`);
    }).then(() => {
      // Create the output message
      let out = {
        endpointStatusCode: response.statusCode,
        statusCode: 201,
        payload: response.body
      };
      if (errors.length > 0) {
        out.errors = errors;
      }
      return out;
    });
  }).catch(this.handleRejection.bind(this));
};
