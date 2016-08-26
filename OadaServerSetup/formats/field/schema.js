var refs = require('../../../../../../refs.js');

module.exports = {
    id: refs.OADA_FIELD_ID,
    description: 'application/vnd.oada.field.1+json',

    // You can add any custom keys to irrigation that you want
    additionalProperties: true,

    // Here are the standard-defined keys:
    properties: {
        context: {
            grower: {
                $ref: refs.OADA_GROWER_ID,
            },
            farm: {
                $ref: refs.OADA_FARM_ID,
            },
        },
        name: {
            type: 'string'
        },
        boundary: {
            type: 'geojson'
        },
        zones: {

        },
    },
};
