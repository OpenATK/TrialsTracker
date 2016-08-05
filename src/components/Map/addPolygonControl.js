import { PropTypes } from 'react';
import { control } from 'leaflet';
import MapControl from '../../node_modules/react-leaflet/src/MapControl';

export default class AttributionControl extends MapControl {
  static propTypes = {
    prefix: PropTypes.string,
  };

  componentWillMount() {
    this.leafletElement = control.attribution(this.props);
  }
}
