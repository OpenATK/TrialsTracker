export default {
  bookmarks: {
    _type: "application/vnd.oada.bookmarks.1+json",
    _rev: 0,
    fields: {
      _type: "application/vnd.oada.fields.1+json",
      _rev: 0,
      fields: {
        "*": {
          _type: "application/vnd.oada.field.1+json",
          _rev: 0,
          farm: {
            _type: "application/vnd.oada.farm.1+json",
          }
        }
      },
      farms: {
        "*": {
          _type: "application/vnd.oada.farm.1+json",
          _rev: 0
        }
      }
    },
    seasons: {
      _type: "application/vnd.oada.seasons.1+json",
      _rev: 0,
      "*": {
        _type: "application/vnd.oada.season.1+json",
        _rev: 0,
        fields: {
          "*": {
            _type: "application/vnd.oada.field.1+json",
            _rev: 0,
            operations: {
              "*": {
                _type: "application/vnd.oada.operation.1+json"
              }
            }
          }
        },
        farms: {
          "*": {
            _type: "application/vnd.oada.farm.1+json",
            _rev: 0
          }
        },
        operations: {
          "*": {
            _type: "application/vnd.oada.operation.1+json",
            _rev: 0
          }
        }
      }
    }
  }
};
