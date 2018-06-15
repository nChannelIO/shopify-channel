'use strict';

module.exports = {
  queryForProductMatrices,
  enrichProductsWithMetafields,
  getMetafieldsWithPaging
};

function queryForProductMatrices(uri, pageSize) {
  let options = {
    method: 'GET',
    uri: uri,
    resolveWithFullResponse: true
  };

  this.info(`Requesting [${options.method} ${options.uri}]`);

  return this.request(options).then(response => {
    let products = response.body.products || [];

    return this.enrichProductsWithMetafields(products).then(enrichedProducts => {
      enrichedProducts = enrichedProducts.map(enrichedProduct => {
        return {product: enrichedProduct};
      });

      return this.formatGetResponse(enrichedProducts, pageSize, response.statusCode);
    });
  }).catch(this.handleRejection.bind(this));
}

function enrichProductsWithMetafields(products) {
  return Promise.all(products.map(product => {
    let uri = `${this.baseUri}/admin/products/${product.id}/metafields.json`;

    return this.getMetafieldsWithPaging(uri).then(metafields => {
      product.metafields = metafields;
      return product;
    });
  }));
}

function getMetafieldsWithPaging(uri, page = 1, result = []) {
  let pageSize = 250; //Max page size supported
  let options = {
    method: 'GET',
    uri: `${uri}?page=${page}&limit=${pageSize}`
  };

  this.info(`Requesting [${options.method} ${options.uri}]`);

  return this.request(options).then(body => {
    result = result.concat(body.metafields);

    if (body.metafields.length === pageSize) {
      return this.getMetafieldsWithPaging(options, uri, ++page, result);
    } else {
      return result;
    }
  });
}