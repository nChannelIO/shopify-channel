'use strict';

module.exports = function (flowContext, query) {
  let queryParams = [];

  //Queried dates are exclusive so skew by 1 ms to create an equivalent inclusive range
  queryParams.push("created_at_min=" + new Date(Date.parse(query.createdDateRange.startDateGMT) - 1).toISOString());
  queryParams.push("created_at_max=" + new Date(Date.parse(query.createdDateRange.endDateGMT) + 1).toISOString());

  if (query.pageSize) {
    queryParams.push("limit=" + query.pageSize);
  }

  let nextPage;
  if (query.pagingContext && query.pagingContext.next) {
    nextPage = query.pagingContext.next.url;
  } else {
    nextPage = `${this.baseUri}/admin/api/${this.apiVersion}/customers.json?${queryParams.join('&')}`;
  }

  return this.queryForCustomers(nextPage);
};
