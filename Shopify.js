'use strict';

let Channel = require('@nchannel/endpoint-sdk').PromiseChannel;
let errors = require('request-promise/errors')
let parseLinkHeader = require('parse-link-header');

class Shopify extends Channel {
  constructor(...args) {
    super(...args);

    this.validateChannelProfile();

    let headers = {
      "X-Shopify-Access-Token": this.channelProfile.channelAuthValues.access_token
    };

    this.request = this.request.defaults({headers: headers, json: true});

    this.baseUri = `${this.channelProfile.channelSettingsValues.protocol}://${this.channelProfile.channelAuthValues.shop}`;

    this.apiVersion = this.channelProfile.channelSettingsValues.apiVersion || '2020-01';
    this.parseLinkHeader = parseLinkHeader;
  }

  async getCustomerById(...args) {
    return require('./functions/getCustomerById').bind(this)(...args);
  }

  async getCustomerByCreatedTimeRange(...args) {
    return require('./functions/getCustomerByCreatedTimeRange').bind(this)(...args);
  }

  async getCustomerByModifiedTimeRange(...args) {
    return require('./functions/getCustomerByModifiedTimeRange').bind(this)(...args);
  }

  async insertCustomer(...args) {
    return require('./functions/insertCustomer').bind(this)(...args);
  }

  async updateCustomer(...args) {
    return require('./functions/updateCustomer').bind(this)(...args);
  }

  async getProductMatrixById(...args) {
    return require('./functions/getProductMatrixById').bind(this)(...args);
  }

  async getProductMatrixByCreatedTimeRange(...args) {
    return require('./functions/getProductMatrixByCreatedTimeRange').bind(this)(...args);
  }

  async getProductMatrixByModifiedTimeRange(...args) {
    return require('./functions/getProductMatrixByModifiedTimeRange').bind(this)(...args);
  }

  async insertProductMatrix(...args) {
    return require('./functions/insertProductMatrix').bind(this)(...args);
  }

  async updateProductMatrix(...args) {
    return require('./functions/updateProductMatrix').bind(this)(...args);
  }

  async getProductPricingById(...args) {
    return require('./functions/getProductPricingById').bind(this)(...args);
  }

  async getProductPricingByCreatedTimeRange(...args) {
    return require('./functions/getProductPricingByCreatedTimeRange').bind(this)(...args);
  }

  async getProductPricingByModifiedTimeRange(...args) {
    return require('./functions/getProductPricingByModifiedTimeRange').bind(this)(...args);
  }

  async updateProductPricing(...args) {
    return require('./functions/updateProductPricing').bind(this)(...args);
  }

  async getProductQuantityById(...args) {
    return require('./functions/getProductQuantityById').bind(this)(...args);
  }

  async getProductQuantityByCreatedTimeRange(...args) {
    return require('./functions/getProductQuantityByCreatedTimeRange').bind(this)(...args);
  }

  async getProductQuantityByModifiedTimeRange(...args) {
    return require('./functions/getProductQuantityByModifiedTimeRange').bind(this)(...args);
  }

  async updateProductQuantity(...args) {
    return require('./functions/updateProductQuantity').bind(this)(...args);
  }

  async getSalesOrderById(...args) {
    return require('./functions/getSalesOrderById').bind(this)(...args);
  }

  async getSalesOrderByCreatedTimeRange(...args) {
    return require('./functions/getSalesOrderByCreatedTimeRange').bind(this)(...args);
  }

  async getSalesOrderByModifiedTimeRange(...args) {
    return require('./functions/getSalesOrderByModifiedTimeRange').bind(this)(...args);
  }

  async insertSalesOrder(...args) {
    return require('./functions/insertSalesOrder').bind(this)(...args);
  }

  async updateSalesOrder(...args) {
    return require('./functions/updateSalesOrder').bind(this)(...args);
  }

  async insertFulfillment(...args) {
    return require('./functions/insertFulfillment').bind(this)(...args);
  }

  async updateFulfillment(...args) {
    return require('./functions/updateFulfillment').bind(this)(...args);
  }

  async extractBillingAddressFromSalesOrder(...args) {
    return require('./functions/extractBillingAddressFromSalesOrder').bind(this)(...args);
  }

  async extractCustomerFromSalesOrder(...args) {
    return require('./functions/extractCustomerFromSalesOrder').bind(this)(...args);
  }

  async extractShippingAddressFromSalesOrder(...args) {
    return require('./functions/extractShippingAddressFromSalesOrder').bind(this)(...args);
  }


  validateChannelProfile() {
    let errors = [];
    if (!this.channelProfile) {
      errors.push("this.channelProfile was not provided");
    }
    if (!this.channelProfile.channelSettingsValues) {
      errors.push("this.channelProfile.channelSettingsValues was not provided");
    }
    if (!this.channelProfile.channelSettingsValues.protocol) {
      errors.push("this.channelProfile.channelSettingsValues.protocol was not provided");
    }
    if (!this.channelProfile.channelAuthValues) {
      errors.push("this.channelProfile.channelAuthValues was not provided");
    }
    if (!this.channelProfile.channelAuthValues.access_token) {
      errors.push("this.channelProfile.channelAuthValues.access_token was not provided");
    }
    if (!this.channelProfile.channelAuthValues.shop) {
      errors.push("this.channelProfile.channelAuthValues.shop was not provided");
    }
    if (errors.length > 0) {
      throw new Error(`Channel profile validation failed: ${errors}`);
    }
  }

  handleRejection(reason) {
    if (reason instanceof errors.StatusCodeError) {
      return this.handleStatusCodeError(reason);
    } else if (reason instanceof errors.RequestError) {
      return this.handleRequestError(reason);
    } else {
      return this.handleOtherError(reason);
    }
  }

  handleStatusCodeError(reason) {
    this.error(`The endpoint returned an error status code: ${reason.statusCode} error: ${reason.error.toString()}`);

    let out = {
      endpointStatusCode: reason.statusCode,
      errors: [reason.error]
    };

    if (reason.statusCode === 429) {
      out.statusCode = 429;
    } else if (reason.statusCode >= 500) {
      out.statusCode = 500;
    } else if (reason.statusCode === 404) {
      out.statusCode = 404;
    } else if (reason.statusCode === 422) {
      out.statusCode = 400;
    } else {
      out.statusCode = 400;
    }

    return Promise.reject(out);
  }

  handleRequestError(reason) {
    this.error(`The request failed: ${reason.error}`);

    let out = {
      endpointStatusCode: 'N/A',
      statusCode: 500,
      errors: [reason.error]
    };

    return Promise.reject(out);
  }

  handleOtherError(reason) {
    if (!reason || !reason.statusCode || !reason.errors) {
      let out = {
        statusCode: 500,
        errors: [reason  || 'Rejection without reason']
      };
      return Promise.reject(out);
    } else {
      return Promise.reject(reason);
    }
  }

  formatGetResponse(items, response, endpointStatusCode = 'N/A') {
    let linkHeader;
    if (response && response.headers) {
      linkHeader = parseLinkHeader(response.headers['link']);
    }

    return {
      endpointStatusCode: endpointStatusCode,
      statusCode: (linkHeader && linkHeader.next) ? 206 : (items.length > 0 ? 200 : 204),
      payload: items,
      pagingContext: linkHeader
    };
  }

  queryForCustomers(...args) {
    return require('./functions/getCustomerHelpers').queryForCustomers.bind(this)(...args);
  }

  queryForProductMatrices(...args) {
    return require('./functions/getProductMatrixHelpers').queryForProductMatrices.bind(this)(...args);
  }

  enrichProductsWithMetafields(...args) {
    return require('./functions/getProductMatrixHelpers').enrichProductsWithMetafields.bind(this)(...args);
  }

  getMetafieldsWithPaging(...args) {
    return require('./functions/getProductMatrixHelpers').getMetafieldsWithPaging.bind(this)(...args);
  }

  updateProductMetafields(...args) {
    return require('./functions/updateProductMatrixHelpers').updateProductMetafields.bind(this)(...args);
  }

  updateVariantMetafields(...args) {
    return require('./functions/updateProductMatrixHelpers').updateVariantMetafields.bind(this)(...args);
  }

  queryForProductQuantities(...args) {
    return require('./functions/getProductQuantityHelpers').queryForProductQuantities.bind(this)(...args);
  }

  getInventoryItems(...args) {
    return require('./functions/getProductQuantityHelpers').getInventoryItems.bind(this)(...args);
  }

  getInventoryItemsWithPaging(...args) {
    return require('./functions/getProductQuantityHelpers').getInventoryItemsWithPaging.bind(this)(...args);
  }

  getInventoryLevels(...args) {
    return require('./functions/getProductQuantityHelpers').getInventoryLevels.bind(this)(...args);
  }

  getInventoryLevelsWithPaging(...args) {
    return require('./functions/getProductQuantityHelpers').getInventoryLevelsWithPaging.bind(this)(...args);
  }

  updateInventoryItem(...args) {
    return require('./functions/updateProductQuantityHelpers').updateInventoryItem.bind(this)(...args);
  }

  updateInventoryLevels(...args) {
    return require('./functions/updateProductQuantityHelpers').updateInventoryLevels.bind(this)(...args);
  }

  queryForSalesOrders(...args) {
    return require('./functions/getSalesOrderHelpers').queryForSalesOrders.bind(this)(...args);
  }
}

module.exports = Shopify;
