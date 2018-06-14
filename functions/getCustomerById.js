'use strict';

module.exports = function (flowContext, payload) {
  let queryParams = [];

  queryParams.push("ids=" + payload.doc.remoteIDs.join(','));

  queryParams.push("page=" + payload.doc.page);
  queryParams.push("limit=" + payload.doc.pageSize);

  return this.queryForCustomer(`${this.baseUri}?${queryParams.join('&')}`, payload.doc.pageSize);
};
