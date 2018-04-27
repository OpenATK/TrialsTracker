function setFieldBoundingBoxes({props, state}) {
//TODO: need to check for valid data source
  Object.keys(props.bboxes).forEach((field) => {
    state.set(`fields.${field}.boundary.area`, props.areas[field]);
    state.set(`fields.${field}.boundary.bbox`, props.bboxes[field]);
    state.set(`fields.${field}.boundary.centroid`, [(props.bboxes[field].north + props.bboxes[field].south)/2, (props.bboxes[field].east + props.bboxes[field].west)/2]);
  })
}
export default setFieldBoundingBoxes;
