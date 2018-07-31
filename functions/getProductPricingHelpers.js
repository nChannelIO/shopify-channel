'use strict';

module.exports = {
  mapVariantToPricing
};

function mapVariantToPricing(variant) {
  return {
    id: variant.id,
    sku: variant.sku,
    price: variant.price,
    taxable: variant.taxable,
    compare_at_price: variant.compare_at_price,
    updated_at: variant.updated_at
  };
}