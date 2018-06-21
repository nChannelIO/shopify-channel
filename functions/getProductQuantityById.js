'use strict';

module.exports = function (flowContext, query) {
  return this.queryForProductQuantities(query.remoteIDs).then(inventoryItems => {
    return this.formatGetResponse(inventoryItems, undefined, 200);
  }).catch(this.handleRejection.bind(this));
};
