'use strict';

module.exports = function (flowContext, payload) {
  let queryParams = [];

  queryParams.push("modified_at_min=" + new Date(Date.parse(payload.doc.modifiedDateRange.startDateGMT) - 1).toISOString());
  queryParams.push("modified_at_max=" + new Date(Date.parse(payload.doc.modifiedDateRange.endDateGMT) + 1).toISOString());

  queryParams.push("page=" + payload.doc.page);
  queryParams.push("limit=" + payload.doc.pageSize);

  return this.queryForCustomer(`${this.baseUri}?${queryParams.join('&')}`, payload.doc.pageSize);
};
