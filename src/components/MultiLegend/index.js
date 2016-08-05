import React, { Proptypes } from 'react';
import { Decorator as Cerebral } from 'cerebral-view-react';
import { MapComponent } from 'react-leaflet';
import styles from './legend.css';
import Color from 'color';
import uuid from 'uuid';

export default connect({
  legends: 'app.view.legends',
}, {

},

  class Legend extends MapComponent {
    
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
  
    componentWillMount() {
    }
  
    render() {
      var self = this;
      var legendPieces = [];
  
      Object.keys(this.props.legends).forEach(function(key) {
        var levels = self.props.legends[key];
        legendPieces.push(key + ' (bu/ac)');
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
    });
      return (
        <div className={styles['map-legend']}>
          {legendPieces}
        </div>
      );
    }
  }
)
