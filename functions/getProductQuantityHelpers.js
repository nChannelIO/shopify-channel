'use strict';

let _ = require('lodash');

module.exports = {
  queryForProductQuantities,
  getInventoryItems,
  getInventoryItemsWithPaging,
  getInventoryLevels,
  getInventoryLevelsWithPaging
};

function queryForProductQuantities(remoteIDs) {
  return Promise.all([
    this.getInventoryItems(remoteIDs),
    this.getInventoryLevels(remoteIDs)
  ]).then(([inventoryItems, inventoryLevels]) => {
    inventoryItems.forEach(inventoryItem => {
      inventoryItem.inventory_levels = _.filter(inventoryLevels, {inventory_item_id: inventoryItem.id});
    });
    return inventoryItems;
  })
}

function getInventoryItems(inventory_item_ids) {
  let options = {
    method: 'GET',
  };
  let uri = `${this.baseUri}/admin/api/${this.apiVersion}/inventory_items.json?ids=${inventory_item_ids}`;
  return this.getInventoryItemsWithPaging(options, uri);
}

function getInventoryItemsWithPaging(options, uri, page = 1, result = []) {
  let pageSize = 250; //Max page size supported
  options.uri = `${uri}&page=${page}&limit=${pageSize}`;

  this.info(`Requesting [${options.method} ${options.uri}]`);

  return this.request(options).then(body => {
    result = result.concat(body.inventory_items);

    if (body.inventory_items.length === pageSize) {
      return this.getInventoryItemsWithPaging(options, uri, ++page, result);
    } else {
      return result;
    }
  });
}

function getInventoryLevels(inventory_item_ids) {
  let options = {
    method: 'GET',
  };
  let uri = `${this.baseUri}/admin/api/${this.apiVersion}/inventory_levels.json?inventory_item_ids=${inventory_item_ids}`;
  return this.getInventoryLevelsWithPaging(options, uri);
}

function getInventoryLevelsWithPaging(options, uri, page = 1, result = []) {
  let pageSize = 250; //Max page size supported
  options.uri = `${uri}&page=${page}&limit=${pageSize}`;

  this.info(`Requesting [${options.method} ${options.uri}]`);

  return this.request(options).then(body => {
    result = result.concat(body.inventory_levels);

    if (body.inventory_levels.length === pageSize) {
      return this.getInventoryLevelsWithPaging(options, uri, ++page, result);
    } else {
      return result;
    }
  });
}
