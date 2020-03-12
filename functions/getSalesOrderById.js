'use strict';

module.exports = function (flowContext, query) {
  let queryParams = [];

  queryParams.push("ids=" + query.remoteIDs.join(','));

  if (query.page) {
    queryParams.push("page=" + query.page);
  }
  if (query.pageSize) {
    queryParams.push("limit=" + query.pageSize);
  }

  return this.queryForSalesOrders(`${this.baseUri}/admin/api/${this.apiVersion}/orders.json?${queryParams.join('&')}`, query.pageSize);
};
