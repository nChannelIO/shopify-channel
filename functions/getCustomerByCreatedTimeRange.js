'use strict';

module.exports = function (flowContext, payload) {
  let queryParams = [];

  //Queried dates are exclusive so skew by 1 ms to create an equivalent inclusive range
  queryParams.push("created_at_min=" + new Date(Date.parse(payload.doc.createdDateRange.startDateGMT) - 1).toISOString());
  queryParams.push("created_at_max=" + new Date(Date.parse(payload.doc.createdDateRange.endDateGMT) + 1).toISOString());

  if (payload.doc.page) {
    queryParams.push("page=" + payload.doc.page);
  }
  if (payload.doc.pageSize) {
    queryParams.push("limit=" + payload.doc.pageSize);
  }

  return this.queryForCustomers(`${this.baseUri}/admin/customers.json?${queryParams.join('&')}`, payload.doc.pageSize);
};
