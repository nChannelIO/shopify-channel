'use strict';

module.exports = {
  enrichProductsWithMetafields: (products) => {
    let options = {
      method: 'GET'
    };

    return Promise.all(products.map(product => {
      let uri = `${this.baseUri}/admin/products/${product.id}/metafields.json`;

      return this.getMetafieldsWithPaging(options, uri).then(metafields => {
        product.metafields = metafields;
        return product;
      });
    }));
  },

  getMetafieldsWithPaging: (options, uri, page = 1, result = []) => {
    let pageSize = 250; //Max page size supported
    options.uri = `${uri}?page=${page}&limit=${pageSize}`;

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
};