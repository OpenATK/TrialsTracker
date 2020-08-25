export default {
  'bookmarks': {
    '_type': 'application/vnd.oada.bookmarks.1+json',
    '_rev': '0-0',
    'harvest': {
      '_type': 'application/vnd.oada.harvest.1+json',
      '_rev': '0-0',
      'tiled-maps': {
        '_type': 'application/vnd.oada.tiled-maps.1+json',
        '_rev': '0-0',
        'dry-yield-map': {
          '_type': 'application/vnd.oada.tiled-maps.dry-yield-map.1+json',
          '_rev': '0-0',
          'crop-index': {
            '*': {
              '_type': 'application/vnd.oada.tiled-maps.dry-yield-map.1+json',
              '_rev': '0-0',
              'geohash-length-index': {
                '*': {
                  '_type': 'application/vnd.oada.tiled-maps.dry-yield-map.1+json',
                  '_rev': '0-0',
                }
              }
            }
          }
        }
      }
    }
  }
}


