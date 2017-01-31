import polygonsIntersect from '../utils/polygonsIntersect.js';

export default function getFieldDataForNotes({input, state}) {
  var notes = state.get(['app', 'model', 'notes']);
  var fields = state.get(['app', 'model', 'fields']);
  if (fields && input.ids) {
    input.ids.forEach((note) => {
      Object.keys(fields).forEach((field) => {
        if (notes[note].geometry.geojson.coordinates[0].length > 3) {
          if (polygonsIntersect(fields[field].boundary.geojson.coordinates[0], notes[note].geometry.geojson.coordinates[0])) {
            if (fields[field].stats) {
            //get the field average for each crop and compare to note average
              var obj = {};
              Object.keys(fields[field].stats).forEach((crop) => {
                if (notes[note].stats[crop]) {
                  obj[crop] = {
                    difference: notes[note].stats[crop].mean_yield - fields[field].stats[crop].mean_yield
                  }
                }
              })
              state.set(['app', 'model', 'noteFields', note, field], obj);
            }
          }
        }
      })
    })
  }
}

