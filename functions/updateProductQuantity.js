'use strict';

let _ = require('lodash');

module.exports = function (flowContext, payload) {
  return Promise.all([
    this.updateInventoryItem(_.cloneDeep(payload.doc)),
    this.updateInventoryLevels(payload.doc.inventory_item.id, payload.doc.inventory_item.inventory_levels)
  ]).then(([inventoryItem, updatedInventoryLevels]) => {
    // Add the updated inventory levels to the inventory item
    inventoryItem.inventory_item.inventory_levels = updatedInventoryLevels;

    return {
      endpointStatusCode: 200,
      payload: inventoryItem,
      statusCode: 200
    }
  }).catch(this.handleRejection.bind(this));
};
