module.exports = function (flowContext, payload) {
  let queryParams = [];

  let uri = this.channelProfile.channelSettingsValues.protocol + "://" + this.channelProfile.channelAuthValues.shop + "/admin/customers.json";

  if (payload.doc.remoteIDs) {
    /*
     Add remote IDs as a query parameter
     */
    queryParams.push("ids=" + payload.doc.remoteIDs.join(','));

  } else if (payload.doc.modifiedDateRange) {
    /*
     Add modified date ranges to the query
     Queried dates are exclusive so skew by 1 ms to create and equivalent inclusive range
     */

    if (payload.doc.modifiedDateRange.startDateGMT) {
      queryParams.push("updated_at_min=" + new Date(Date.parse(payload.doc.modifiedDateRange.startDateGMT) - 1).toISOString());
    }
    if (payload.doc.modifiedDateRange.endDateGMT) {
      queryParams.push("updated_at_max=" + new Date(Date.parse(payload.doc.modifiedDateRange.endDateGMT) + 1).toISOString());
    }
  } else if (payload.doc.createdDateRange) {
    /*
     Add created date ranges to the query
     Queried dates are exclusive so skew by 1 ms to create and equivalent inclusive range
     */

    if (payload.doc.createdDateRange.startDateGMT) {
      queryParams.push("created_at_min=" + new Date(Date.parse(payload.doc.createdDateRange.startDateGMT) - 1).toISOString());
    }
    if (payload.doc.createdDateRange.endDateGMT) {
      queryParams.push("created_at_max=" + new Date(Date.parse(payload.doc.createdDateRange.endDateGMT) + 1).toISOString());
    }
  }

  /*
   Add page to the query
   */
  if (payload.doc.page) {
    queryParams.push("page=" + payload.doc.page);
  }

  /*
   Add pageSize (limit) to the query
   */
  if (payload.doc.pageSize) {
    queryParams.push("limit=" + payload.doc.pageSize);
  }

  uri += "?" + queryParams.join('&');

  let options = {
    method: 'GET',
    uri: uri,
    resolveWithFullResponse: true
  };

  this.info(`Requesting [${options.method} ${options.uri}]`);

  request(options).then(response => {
    let out = {
      endpointStatusCode: response.statusCode,
      payload: []
    };

    let body = response.body;

    if (body.customers && body.customers.length > 0) {
      body.customers.forEach(customer => {
        out.payload.push({customer: customer});
      });

      if (out.payload.length === payload.doc.pageSize) {
        out.statusCode = 206;
      } else {
        out.statusCode = 200;
      }
    } else {
      out.statusCode = 204;
    }

    return out;
  }).catch(this.requestErrors.RequestError, this.handleRequestError).catch(this.requestErrors.StatusCodeError, this.handleStatusCodeError);
};
