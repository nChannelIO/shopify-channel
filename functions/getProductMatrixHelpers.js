'use strict';

module.exports = {
  queryForProductMatrices,
  enrichProductsWithMetafields,
  getMetafieldsWithPaging
};

function queryForProductMatrices(uri) {
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

      return this.formatGetResponse(enrichedProducts, response, response.statusCode);
    });
  }).catch(this.handleRejection.bind(this));
}

function enrichProductsWithMetafields(products) {
  return Promise.all(products.map(product => {
    let pageSize = 250; //Max page size supported
    let uri = `${this.baseUri}/admin/api/${this.apiVersion}/products/${product.id}/metafields.json?limit=${pageSize}`;

    // Get the products metafields
    return this.getMetafieldsWithPaging(uri).then(metafields => {
      product.metafields = metafields;
      return product;
    });
  }));
}

function getMetafieldsWithPaging(uri, result = []) {
  let options = {
    method: 'GET',
    uri: uri,
    resolveWithFullResponse: true
  };

  this.info(`Requesting [${options.method} ${options.uri}]`);

  return this.request(options).then(response => {
    result = result.concat(response.body.metafields);

    let linkHeader = this.parseLinkHeader(response.headers['link']);

    if (linkHeader && linkHeader.next && linkHeader.next.url) {
      return this.getMetafieldsWithPaging(linkHeader.next.url, result);
    } else {
      return result;
    }
  });
}
