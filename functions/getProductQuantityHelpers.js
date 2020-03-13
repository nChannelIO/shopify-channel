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
  let pageSize = 250; //Max page size supported
  let uri = `${this.baseUri}/admin/api/${this.apiVersion}/inventory_items.json?ids=${inventory_item_ids}&limit=${pageSize}`;
  return this.getInventoryItemsWithPaging(uri);
}

function getInventoryItemsWithPaging(uri, result = []) {
  let options = {
    method: 'GET',
    uri: uri,
    resolveWithFullResponse: true
  };

  this.info(`Requesting [${options.method} ${options.uri}]`);

  return this.request(options).then(response => {
    result = result.concat(response.body.inventory_items);

    let linkHeader = this.parseLinkHeader(response.headers['link']);

    if (linkHeader && linkHeader.next && linkHeader.next.url) {
      return this.getInventoryItemsWithPaging(linkHeader.next.url, result);
    } else {
      return result;
    }
  });
}

function getInventoryLevels(inventory_item_ids) {
  let pageSize = 250; //Max page size supported
  let uri = `${this.baseUri}/admin/api/${this.apiVersion}/inventory_levels.json?inventory_item_ids=${inventory_item_ids}&limit=${pageSize}`;
  return this.getInventoryLevelsWithPaging(uri);
}

function getInventoryLevelsWithPaging(uri, result = []) {
  let options = {
    method: 'GET',
    uri: uri,
    resolveWithFullResponse: true
  };

  this.info(`Requesting [${options.method} ${options.uri}]`);

  return this.request(options).then(response => {
    result = result.concat(response.body.inventory_levels);

    let linkHeader = this.parseLinkHeader(response.headers['link']);

    if (linkHeader && linkHeader.next && linkHeader.next.url) {
      return this.getInventoryLevelsWithPaging(linkHeader.next.url, result);
    } else {
      return result;
    }
  });
}
