'use strict';

module.exports = {
  updateInventoryItem,
  updateInventoryLevels
};

function updateInventoryItem(inventoryItem) {
  // Delete the inventory levels
  delete inventoryItem.inventory_levels;

  let options = {
    method: 'PUT',
    uri: `${this.baseUri}/admin/inventory_items/${inventoryItem.inventory_item.id}.json`,
    body: inventoryItem
  };

  this.info(`Requesting [${options.method} ${options.uri}]`);

  return this.request(options);
}

function updateInventoryLevels(inventoryItemId, inventoryLevels) {
  if (inventoryLevels) {
    let options = {
      method: 'POST',
      uri: `${this.baseUri}/admin/inventory_levels/set.json`
    };

    this.info(`Updating ${inventoryLevels.length} inventory levels`);
    this.info(`Requesting [${options.method} ${options.uri}]`);

    return Promise.all(inventoryLevels.map(inventoryLevel => {
      inventoryLevel.inventory_item_id = inventoryItemId;
      options.body = inventoryLevel;

      return this.request(options).then(body => body.inventory_level);
    }));
  } else {
    return Promise.resolve([]);
  }
}