import polygonsIntersect from '../../Map/utils/polygonsIntersect.js';
import { Promise } from 'bluebird';  

function getFieldDataForNotes({props, state, path}) {
  var notes = state.get('Note.notes');
  var fields = state.get('Fields');
  if (fields && props.notes) {
		var noteFields = {};
    return Promise.map(Object.keys(props.notes), (noteId) => {
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
		}).catch((error) => {
			console.log(error)
      return path.error(error);
		})
  } else return path.error({});
}
export default getFieldDataForNotes;
