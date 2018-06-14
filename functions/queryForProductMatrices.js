'use strict';

module.exports = function (uri, pageSize) {
  let options = {
    method: 'GET',
    uri: uri,
    resolveWithFullResponse: true
  };

  this.info(`Requesting [${options.method} ${options.uri}]`);

  this.request(options).then(response => {
    let products = response.body.products || [];

    return this.enrichProductsWithMetafields(products).then(enrichedProducts => {
      enrichedProducts = enrichedProducts.map(enrichedProduct => {
        return {product: enrichedProduct};
      });

      return this.formatGetResponse(enrichedProducts, pageSize, 200);
    });
  }).catch(this.requestErrors.RequestError, this.handleRequestError).catch(this.requestErrors.StatusCodeError, this.handleStatusCodeError).catch(this.handleOtherError);
};
