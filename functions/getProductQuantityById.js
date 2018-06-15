'use strict';

module.exports = function (flowContext, payload) {
  return this.queryForProductQuantities(payload.doc.remoteIDs).then(inventoryItems => {
    return this.formatGetResponse(inventoryItems, undefined, 200);
  }).catch(this.handleRejection);
};
