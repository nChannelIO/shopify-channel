'use strict';

module.exports = function (flowContext, payload) {
  return Promise.all([
    this.updateInventoryItem(payload.doc),
    this.updateInventoryLevels(payload.doc.inventory_levels)
  ]).then(([inventoryItem, updatedInventoryLevels]) => {
      // Add the updated inventory levels to the inventory item
      inventoryItem.inventory_levels = updatedInventoryLevels;

      return {
        endpointStatusCode: 200,
        payload: inventoryItem,
        statusCode: 200
      }
  }).catch(this.handleRejection.bind(this));
};
