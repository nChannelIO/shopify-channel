'use strict';

let Channel = require('@nchannel/nchannel-endpoint-sdk').PromiseChannel;

class Shopify extends Channel {
  constructor(...args) {
    super(...args);

    this.validateChannelProfile();

    this.request = require('request-promise');
    this.requestErrors = require('request-promise/errors');

    let headers = {
      "X-Shopify-Access-Token": this.channelProfile.channelAuthValues.access_token
    };

    this.request.defaults({headers: headers, json: true});

    this.baseUri = `${this.channelProfile.channelSettingsValues.protocol}://${this.channelProfile.channelAuthValues.shop}`;
  }

  getCustomerById(...args) {
    return require('./functions/getCustomerById').bind(this)(...args);
  }

  getCustomerByCreatedTimeRange(...args) {
    return require('./functions/getCustomerByCreatedTimeRange').bind(this)(...args);
  }

  getCustomerByModifiedTimeRange(...args) {
    return require('./functions/getCustomerByModifiedTimeRange').bind(this)(...args);
  }

  insertCustomer(...args) {
    return require('./functions/insertCustomer').bind(this)(...args);
  }

  updateCustomer(...args) {
    return require('./functions/updateCustomer').bind(this)(...args);
  }

  getProductMatrixById(...args) {
    return require('./functions/getProductMatrixById').bind(this)(...args);
  }

  getProductMatrixByCreatedTimeRange(...args) {
    return require('./functions/getProductMatrixByCreatedTimeRange').bind(this)(...args);
  }

  getProductMatrixByModifiedTimeRange(...args) {
    return require('./functions/getProductMatrixByModifiedTimeRange').bind(this)(...args);
  }

  insertProductMatrix(...args) {
    return require('./functions/insertProductMatrix').bind(this)(...args);
  }

  updateProductMatrix(...args) {
    return require('./functions/updateProductMatrix').bind(this)(...args);
  }

  getProductPricingById(...args) {
    return require('./functions/getProductPricingById').bind(this)(...args);
  }

  getProductPricingByCreatedTimeRange(...args) {
    return require('./functions/getProductPricingByCreatedTimeRange').bind(this)(...args);
  }

  getProductPricingByModifiedTimeRange(...args) {
    return require('./functions/getProductPricingByModifiedTimeRange').bind(this)(...args);
  }

  updateProductPricing(...args) {
    return require('./functions/updateProductPricing').bind(this)(...args);
  }

  getSalesOrderById(...args) {
    return require('./functions/getSalesOrderById').bind(this)(...args);
  }

  getSalesOrderByCreatedTimeRange(...args) {
    return require('./functions/getSalesOrderByCreatedTimeRange').bind(this)(...args);
  }

  getSalesOrderByModifiedTimeRange(...args) {
    return require('./functions/getSalesOrderByModifiedTimeRange').bind(this)(...args);
  }

  insertSalesOrder(...args) {
    return require('./functions/insertSalesOrder').bind(this)(...args);
  }

  updateSalesOrder(...args) {
    return require('./functions/updateSalesOrder').bind(this)(...args);
  }

  insertFulfillment(...args) {
    return require('./functions/insertFulfillment').bind(this)(...args);
  }

  updateFulfillment(...args) {
    return require('./functions/updateFulfillment').bind(this)(...args);
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

  handleStatusCodeError(reason) {
    this.error(`The endpoint returned an error status code: ${reason.statusCode} error: ${reason.error}`);

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

  formatGetResponse(items, pageSize, endpointStatusCode = 'N/A') {
    return {
      endpointStatusCode: endpointStatusCode,
      statusCode: items.length === pageSize ? 206 : (items.length > 0 ? 200 : 204),
      payload: items
    };
  }

  queryForCustomers(...args) {
    return require('./functions/queryForCustomers').bind(this)(...args);
  }

  queryForProductMatrices(...args) {
    return require('./functions/queryForProductMatrices').bind(this)(...args);
  }

  enrichProductsWithMetafields(...args) {
    return require('./functions/getProductMatrixHelper').enrichProductsWithMetafields.bind(this)(...args);
  }

  getMetafieldsWithPaging(...args) {
    return require('./functions/getProductMatrixHelper').getMetafieldsWithPaging.bind(this)(...args);
  }
}

module.exports = Shopify;
