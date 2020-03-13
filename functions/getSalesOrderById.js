'use strict';

module.exports = function (flowContext, query) {
  let queryParams = [];

  queryParams.push("ids=" + query.remoteIDs.join(','));

  if (query.pageSize) {
    queryParams.push("limit=" + query.pageSize);
  }

  let nextPage;
  if (query.pagingContext && query.pagingContext.next) {
    nextPage = query.pagingContext.next.url;
  } else {
    nextPage = `${this.baseUri}/admin/api/${this.apiVersion}/orders.json?${queryParams.join('&')}`;
  }

  return this.queryForSalesOrders(nextPage);
};
