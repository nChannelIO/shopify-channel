'use strict';

module.exports = function (flowContext, payload) {
  let queryParams = [];

  //Queried dates are exclusive so skew by 1 ms to create an equivalent inclusive range
  queryParams.push("updated_at_min=" + new Date(Date.parse(payload.doc.modifiedDateRange.startDateGMT) - 1).toISOString());
  queryParams.push("updated_at_max=" + new Date(Date.parse(payload.doc.modifiedDateRange.endDateGMT) + 1).toISOString());

  queryParams.push("page=" + payload.doc.page);
  queryParams.push("limit=" + payload.doc.pageSize);

  return this.queryForCustomers(`${this.baseUri}/admin/customers.json?${queryParams.join('&')}`, payload.doc.pageSize);
};
