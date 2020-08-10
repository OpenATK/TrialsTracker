import React from 'react';
import Control from 'react-leaflet-control';
import overmind from "../../overmind"
import {v1 as uuid} from 'uuid';
import Color from 'color';
import './legend.css';

export default function LegendControl() {
  const { actions, state } = overmind();
  const myState = actions.view.Map;
  let yieldDataIndex = state.Yield.data_index;
  
  let legendPieces = [];
 
  Object.keys(yieldDataIndex).forEach(function(crop) {
    if (myState.LayersControl.cropLayers[crop].visible) {
      let levels = myState.legends[crop];
      let title = crop.charAt(0).toUpperCase() + crop.slice(1);
      legendPieces.push(title + ' (bu/ac)');
      legendPieces.push(<br key={uuid.v4()}/>);
      // loop through our density intervals and generate a label with a colored square for each interval
      for (let i = 0; i < levels.length-1; i++) {
        //get colors at each end
        let st = {background: 'linear-gradient(to bottom,'+ Color(levels[i].color).hexString()+','+ Color(levels[i+1].color).hexString()+')'};
        //let label = levels[i].value.toFixed(2).toString() + (levels[i + 1] ? '-' + levels[i + 1].value.toFixed(2).toString() : '+');
        let label;
        if (i === 0) {
          label = levels[i].value.toFixed(2).toString();
        } else if (i === levels.length-2) {
          label = levels[i+1].value.toFixed(2).toString();
        } else {
          label = null;
        }
        let brk = levels[i+1] ? <br/> : {};
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
        className={(legendPieces.length > 0) ? 'legend-control' : 'hidden'}>
        {legendPieces}
      </div>
    </Control>
  );
}
