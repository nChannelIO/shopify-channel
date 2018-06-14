'use strict';

module.exports = function (flowContext, payload) {
  let queryParams = [];

  queryParams.push("ids=" + payload.doc.remoteIDs.join(','));

  queryParams.push("page=" + payload.doc.page);
  queryParams.push("limit=" + payload.doc.pageSize);

  return this.queryForCustomers(`${this.baseUri}/admin/customers.json?${queryParams.join('&')}`, payload.doc.pageSize);
};
