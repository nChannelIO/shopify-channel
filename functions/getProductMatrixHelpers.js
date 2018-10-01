'use strict';

let errors = require('request-promise/errors');

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

    // Get the products metafields
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
  }).catch(errors.StatusCodeError, err => {
    // If we get a 404 change it to 400
    if (err.statusCode === 404) {
      return Promise.reject({
        statusCode: 400,
        errors: [
          `Get metafields using '${options.uri}' returned 404. Setting status code to 400.`
        ]
      })
    } else {
      // Otherwise let the error fall through and be caught elsewhere
      return Promise.reject(err);
    }
  });
}