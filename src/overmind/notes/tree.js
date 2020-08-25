module.exports = {
  'bookmarks': {
    '_type': 'application/vnd.oada.bookmarks.1+json',
    '_rev': 0,
    'notes': {
      '_type': 'application/vnd.oada.notes.1+json',
      '_rev': 0,
      'fields-index': {
        '*': {
          '_type': 'application/vnd.oada.note.1+json',
          '_rev': 0,
          'yield-stats': {
            '_type': 'application/vnd.oada.yield.1+json',
            'geohashes': {
              '*': {
                'crop-index': {
                  '*': {
                    'bucket': {
                      '_type': 'application/vnd.oada.yield.1+json',
                      '_rev': 0
                    }
                  }
                }
              }
            },
          }
        }
      },
      'notes-index': {
        '*': {
          '_type': 'application/vnd.oada.note.1+json',
          '_rev': 0,
          'yield-stats': {
            '_type': 'application/vnd.oada.yield.1+json',
            'geohashes': {
              '*': {
                'crop-index': {
                  '*': {
                    'bucket': {
                      '_type': 'application/vnd.oada.yield.1+json',
                      '_rev': 0
                    }
                  }
                }
              }
            },
          }
        }
      }
    }
  }
}
