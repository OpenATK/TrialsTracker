import React from 'react';
import { connect } from 'cerebral-view-react';
import { MapControl } from 'react-leaflet';
import Control from 'react-leaflet-control';
import uuid from 'uuid';
import Color from 'color';
import styles from './legend.css';

export default connect(props => ({
  legends: 'app.view.legends',
  yieldDataIndex: 'app.model.yield_data_index',
  cropLayers: 'app.view.map.crop_layers',
  isMobile: 'app.is_mobile',
}), {
},

class LegendControl extends React.Component {  

  blendColors(c1, c2, percent) {
    let a1 = (typeof c1.a === 'undefined') ? 255 : c1.a; // Defualt opaque
    let a2 = (typeof c1.b === 'undefined') ? 255 : c1.b;
    return { 
      r: c1.r * percent + c2.r * (1-percent),
      g: c1.g * percent + c2.g * (1-percent),
      b: c1.b * percent + c2.b * (1-percent),
      a:   a1 * percent +   a2 * (1-percent),
    };
  }

  render() {
    var self = this;
    var legendPieces = [];
 
    Object.keys(this.props.yieldDataIndex).forEach(function(crop) {
      if (self.props.cropLayers[crop].visible) {
        var levels = self.props.legends[crop];
        var title = crop.charAt(0).toUpperCase() + crop.slice(1);
        legendPieces.push(title + ' (bu/ac)');
        legendPieces.push(<br key={uuid.v4()}/>);
        // loop through our density intervals and generate a label with a colored square for each interval
        for (var i = 0; i < levels.length-1; i++) {
          var startVal = levels[i].value;
          var endVal = levels[i+1].value;
          //find the percent of overall range that it occupies
          var rangePercent = (endVal - startVal)/(levels[levels.length-1].value - levels[0].value);
          //get colors at each end
          var startColor = levels[i].color;
          var endColor = levels[i+1].color;
          var st = {background: 'linear-gradient(to bottom,'+ Color(levels[i].color).hexString()+','+ Color(levels[i+1].color).hexString()+')'};
          //var label = levels[i].value.toFixed(2).toString() + (levels[i + 1] ? '-' + levels[i + 1].value.toFixed(2).toString() : '+');
          if (i == 0) {
            var label = levels[i].value.toFixed(2).toString();
          } else if (i == levels.length-2) {
            var label = levels[i+1].value.toFixed(2).toString();
          } else {
            var label = null;
          }
          var brk = levels[i+1] ? <br/> : {};
          legendPieces.push(
            <span key={uuid.v4()}>
              <i style={st} key={uuid.v4()}></i>
              {label}
              {brk}
            </span>
          );
        }
      }
    })

    return(
      <Control
        position={this.props.position}>
        <div
          className={styles[(legendPieces.length > 0) ? 'legend-control' : 'hidden']}>
          {legendPieces}
        </div>
      </Control>
    );
  }
})
