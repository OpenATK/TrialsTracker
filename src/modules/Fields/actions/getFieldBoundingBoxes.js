import computeBoundingBox from '../../Map/utils/computeBoundingBox.js'
import gjArea from '@mapbox/geojson-area';
import Promise from 'bluebird';

function getFieldBoundingBoxes({props, state, path}) {
  var bboxes = {};
	var areas = {};
  return Promise.map(Object.keys(props.fields['fields-index']), (fieldGroup) => {
    return Promise.map(Object.keys(props.fields['fields-index'][fieldGroup]['fields-index']), (field) => {
			bboxes[field] = computeBoundingBox(props.fields['fields-index'][fieldGroup]['fields-index'][field].boundary.geojson);
			areas[field] = gjArea.geometry(props.fields['fields-index'][fieldGroup]['fields-index'][field].boundary.geojson)/4046.86;
		})
  }).then((result) => {
    return path.success({bboxes, areas})
  }).catch((err) => {
    return path.error({err});
  })
}
export default getFieldBoundingBoxes;
