import computeBoundingBox from '../../Map/utils/computeBoundingBox.js'
import gjArea from '@mapbox/geojson-area';
import Promise from 'bluebird';

function computeFieldBoundingBoxes({props, state, path}) {
  var bboxes = {};
  var areas = {};
  return Promise.map(Object.keys(props.fields), (field) => {
    bboxes[field] = computeBoundingBox(props.fields[field].boundary.geojson);
    areas[field] = gjArea.geometry(props.fields[field].boundary.geojson)/4046.86;
    return true;
  }).then((result) => {
    return path.success({bboxes, areas})
  }).catch((err) => {
    return path.error({err});
  })
}
export default computeFieldBoundingBoxes;
