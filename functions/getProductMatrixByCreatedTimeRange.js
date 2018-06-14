'use strict';

module.exports = function (flowContext, payload) {
  let queryParams = [];

  queryParams.push("created_at_min=" + new Date(Date.parse(payload.doc.createdDateRange.startDateGMT) - 1).toISOString());
  queryParams.push("created_at_max=" + new Date(Date.parse(payload.doc.createdDateRange.endDateGMT) + 1).toISOString());

  queryParams.push("page=" + payload.doc.page);
  queryParams.push("limit=" + payload.doc.pageSize);

  return this.queryForProductMatrices(`${this.baseUri}?${queryParams.join('&')}`, payload.doc.pageSize);
};
