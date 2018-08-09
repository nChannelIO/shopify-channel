'use strict';

module.exports = {
  updateProductMetafields,
  updateVariantMetafields
};

function updateProductMetafields(payload) {
  // Get existing product metafields
  let uri = `${this.baseUri}/admin/products/${payload.productRemoteID}/metafields.json`;

  return this.getMetafieldsWithPaging(uri).then(metafields => {
    // Determine which metafields need updated/inserted
    if (!payload.doc.product.metafields) {
      payload.doc.product.metafields = [];
    }
    let metafieldsForUpdate = payload.doc.product.metafields.reduce((metafieldsForUpdate, metafield) => {
      let match = false;

      // Loop through all existing metafields looking for a match
      for (let i = 0; i < metafields.length; i++) {
        let existingMetafield = metafields[i];
        if (metafield.namespace === existingMetafield.namespace && metafield.key === existingMetafield.key) {
          // It's a match
          match = true;

          if (metafield.value !== existingMetafield.value || metafield.value_type !== existingMetafield.value_type || metafield.description !== existingMetafield.description) {
            // It needs updated
            metafield.id = existingMetafield.id;
            metafieldsForUpdate.push(metafield);

            // Remove it to speed up future iterations
            metafields.splice(i, 1);
          }
          break;
        }
      }

      if (!match) {
        // It needs inserted
        metafieldsForUpdate.push(metafield);
      }

      return metafieldsForUpdate;
    }, []);

    return [metafields, metafieldsForUpdate];
  }).then(([existingMetafields, metafieldsForUpdate]) => {
    // Update the metafields
    return Promise.all(metafieldsForUpdate.map(metafield => {
      if (metafield.id) {
        // Update existing metafield
        let options = {
          uri: `${this.baseUri}/admin/products/${payload.productRemoteID}/metafields/${metafield.id}.json`,
          method: 'PUT',
          body: {metafield: metafield}
        };

        this.info(`Requesting [${options.method} ${options.uri}]`);

        return this.request(options);
      } else {
        // Insert new metafield
        let options = {
          uri: `${this.baseUri}/admin/products/${payload.productRemoteID}/metafields.json`,
          method: 'POST',
          body: {metafield: metafield}
        };

        this.info(`Requesting [${options.method} ${options.uri}]`);

        return this.request(options);
      }
    })).then(updatedMetafields => {
      payload.doc.product.metafields = existingMetafields.concat(updatedMetafields);
    });
  });
}

function updateVariantMetafields(payload) {
  // Update variant metafields
  return Promise.all(payload.doc.product.variants.map(variant => {
    if (variant.id && variant.metafields && variant.metafields.length > 0) {
      // Get existing variant metafields
      let uri = `${this.baseUri}/admin/products/${payload.productRemoteID}/variants/${variant.id}/metafields.json`;

      return this.getMetafieldsWithPaging(uri).then(metafields => {
        // Determine which metafields need updated/inserted
        return variant.metafields.reduce((metafieldsForUpdate, metafield) => {
          let match = false;

          // Loop through all existing metafields looking for a match
          for (let i = 0; i < metafields.length; i++) {
            let existingMetafield = metafields[i];
            if (metafield.namespace === existingMetafield.namespace && metafield.key === existingMetafield.key) {
              // It's a match
              match = true;
              // Remove it to speed up future iterations
              metafields.splice(i, 1);

              if (metafield.value !== existingMetafield.value || metafield.value_type !== existingMetafield.value_type || metafield.description !== existingMetafield.description) {
                // It needs updated
                metafield.id = existingMetafield.id;
                metafieldsForUpdate.push(metafield);
              }
              break;
            }
          }

          if (!match) {
            // It needs inserted
            metafieldsForUpdate.push(metafield);
          }

          return metafieldsForUpdate;
        }, []);
      }).then(metafields => {
        // Update the metafields
        return Promise.all(metafields.map(metafield => {
          if (metafield.id) {
            // Update existing metafield
            let options = {
              uri: `${this.baseUri}/admin/products/${payload.productRemoteID}/variants/${variant.id}/metafields/${metafield.id}.json`,
              method: 'PUT',
              body: {metafield: metafield}
            };

            this.info(`Requesting [${options.method} ${options.uri}]`);

            return this.request(options);
          } else {
            // Insert new metafield
            let options = {
              uri: `${this.baseUri}/admin/products/${payload.productRemoteID}/variants/${variant.id}/metafields.json`,
              method: 'POST',
              body: {metafield: metafield}
            };

            this.info(`Requesting [${options.method} ${options.uri}]`);

            return this.request(options);
          }
        }));
      });
    } else {
      return Promise.resolve();
    }
  }));
}
