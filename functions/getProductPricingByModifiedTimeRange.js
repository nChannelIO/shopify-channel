'use strict';

let moment = require('moment');

module.exports = function (flowContext, query) {
  let queryParams = [];

  //Queried dates are exclusive so skew by 1 ms to create an equivalent inclusive range
  queryParams.push("updated_at_min=" + new Date(Date.parse(query.modifiedDateRange.startDateGMT) - 1).toISOString());
  queryParams.push("updated_at_max=" + new Date(Date.parse(query.modifiedDateRange.endDateGMT) + 1).toISOString());

  if (query.pageSize) {
    queryParams.push("limit=" + query.pageSize);
  }

  /**
   * We cant query variants by their updated_at field. But when
   * a variant is updated the associated product is also updated.
   *
   * So we'll do this instead.
   * 1) Get all products which were modified in the time range
   * 2) Filter out variants which were updated in the time range
   */

  let nextPage;
  if (query.pagingContext && query.pagingContext.next) {
    nextPage = query.pagingContext.next.url;
  } else {
    nextPage = `${this.baseUri}/admin/api/${this.apiVersion}/products.json?${queryParams.join('&')}`;
  }

  let options = {
    method: 'GET',
    uri: nextPage,
    resolveWithFullResponse: true
  };

  this.info(`Requesting [${options.method} ${options.uri}]`);

  let out = {};

  return this.request(options).then(response => {
    if (response.body.products && response.body.products.length > 0) {
      let linkHeader = this.parseLinkHeader(response.headers['link']);

      if (linkHeader && linkHeader.next) {
        out.statusCode = 206;
      }

      // 2) Filter out variants which were updated in the time range
      return Promise.all(response.body.products.map(product => {
        return Promise.all(product.variants.filter(variant => {
          return withinTimeRange(variant.updated_at, startTime, endTime);
        }));
      })).then(variants => {
        return variants.reduce((flattened, array) => {
          return flattened.concat(array);
        }, []);
      });
    } else {
      return [];
    }
  }).then(variants => {
    if (out.statusCode !== 206) {
      out.statusCode = variants.length > 0 ? 200 : 204;
    }

    out.query = variants.map(this.mapVariantToPricing);

    return out;
  }).catch(this.handleRejection.bind(this));
};

function withinTimeRange(time, start, end) {
  if (!time || !(start || end)) {
    return false;
  }
  if (start && end) {
    return moment(time).isBetween(start, end, null, '[]');
  } else if (start) {
    return moment(time).isSameOrAfter(start);
  } else {
    return moment(time).isSameOrBefore(end);
  }
}
