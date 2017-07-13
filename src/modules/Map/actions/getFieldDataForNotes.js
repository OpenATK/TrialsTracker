import polygonsIntersect from '../utils/polygonsIntersect.js';
import { Promise } from 'bluebird';  

export default function getFieldDataForNotes({props, state, path}) {
  var notes = state.get(['app', 'model', 'notes']);
  var fields = state.get(['app', 'model', 'fields']);
  if (fields && props.ids) {
    var noteFields = {};
    return Promise.map(props.ids, (noteId) => {
      noteFields[noteId] = {};
      return Promise.map(Object.keys(fields), (fieldId) => {
        if (notes[noteId].geometry.geojson.coordinates[0].length > 3) {
          if (polygonsIntersect(fields[fieldId].boundary.geojson.coordinates[0], notes[noteId].geometry.geojson.coordinates[0])) {
            if (fields[fieldId].stats) {
              noteFields[noteId][fieldId] = {};
              return Promise.map(Object.keys(fields[fieldId].stats), (crop) => {
                if (notes[noteId].stats[crop]) {
                  noteFields[noteId][fieldId][crop] = {
                    difference: fields[fieldId].stats[crop].mean_yield - notes[noteId].stats[crop].mean_yield
                  }
                  return true;
                } else return false;
              })
            } else return false;
          } else return false;
        } else return false;
      })
    }).then((result) => {
      return path.success({noteFields});
    })
  } else return path.error({});
}
