import polygonsIntersect from '../../map/utils/polygonsIntersect.js';
import { Promise } from 'bluebird';  
import gaussian from 'gaussian';
let dist = gaussian(0,1);

function getFieldDataForNotes({props, state, path}) {
	var notes = props.notes;
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
									let fieldStats = fields[fieldId].stats[crop];
									let noteStats = notes[noteId].stats[crop];
									noteFields[noteId][fieldId][crop] = {
										comparison: {
										  differenceMeans: fieldStats.yield.mean - noteStats.yield.mean,
										  standardError: fieldStats.yield.standardDeviation/Math.pow(noteStats.count, 0.5),
									  }
									}
									noteFields[noteId][fieldId][crop].comparison.zScore = (noteStats.yield.mean - fieldStats.yield.mean)/noteFields[noteId][fieldId][crop].comparison.standardError;
									noteFields[noteId][fieldId][crop].comparison.pValue = noteFields[noteId][fieldId][crop].comparison.zScore > 0 ? 2*(1 - dist.cdf(noteFields[noteId][fieldId][crop].comparison.zScore)) : 2*(dist.cdf(noteFields[noteId][fieldId][crop].comparison.zScore))
									noteFields[noteId][fieldId][crop].comparison.signficantDifference = noteFields[noteId][fieldId][crop].comparison.pValue < 0.05;
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
