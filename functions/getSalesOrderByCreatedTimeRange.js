'use strict';

module.exports = function (flowContext, query) {
  let queryParams = [];

  //Queried dates are exclusive so skew by 1 ms to create an equivalent inclusive range
  queryParams.push("created_at_min=" + new Date(Date.parse(query.createdDateRange.startDateGMT) - 1).toISOString());
  queryParams.push("created_at_max=" + new Date(Date.parse(query.createdDateRange.endDateGMT) + 1).toISOString());

  if (query.page) {
    queryParams.push("page=" + query.page);
  }
  if (query.pageSize) {
    queryParams.push("limit=" + query.pageSize);
  }

  return this.queryForSalesOrders(`${this.baseUri}/admin/api/${this.apiVersion}/orders.json?${queryParams.join('&')}`, query.pageSize);
};
