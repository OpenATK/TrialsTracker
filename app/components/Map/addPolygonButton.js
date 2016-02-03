import { PropTypes } from 'react';
import { control } from 'leaflet';
import MapControl from '../../node_modules/react-leaflet/src/MapControl';

export default class AddPolygonControl extends MapControl {
  static propTypes = {
  };

  componentWillMount() {
    this.leafletElement = control.addPolygon(this.props);
  }
}
