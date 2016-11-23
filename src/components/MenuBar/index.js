import React from 'react';
import { connect } from 'cerebral-view-react';
import styles from './menu-bar.css';
import uuid from 'uuid';

export default connect({
  yieldDataIndex: 'app.model.yield_data_index',
  cropLayers: 'app.view.map.crop_layers',
  cropDropdownVisible: 'app.view.crop_dropdown_visible',
}, {
  setDomainButtonClicked: 'app.setDomainButtonClicked',
  clearCacheButtonClicked: 'app.clearCacheButtonClicked',
  toggleCropLayer: 'app.toggleCropLayer',
  cropDropdownClicked: 'app.cropDropdownClicked',
},

class MenuBar extends React.Component {

  render() {
    var cropList = [];
    Object.keys(this.props.cropLayers).forEach((crop) => {
      cropList.push(
        <div
          className={styles["crop-checkbox-text"]}
          key={uuid.v4()}>
          <input
            key={uuid.v4()}
            type="checkbox"
            onChange={()=>this.props.toggleCropLayer({crop})}
            checked={this.props.cropLayers[crop].visible}
            className="crop-checkbox">
          </input>
          {crop}
        </div>
      )
      cropList.push(
        
      )
    })

    return (
      <div className={styles['menu-bar']}>
        <button 
          type="button" 
          className={styles['clear-cache-button']}
          onClick={()=>this.props.clearCacheButtonClicked({})}>
          Clear Cache
        </button>
        <button 
          type="button" 
          className={styles['change-domain-button']}
          onClick={()=>this.props.setDomainButtonClicked({})}>
          Change Domain
        </button>
        <div 
          onClick={()=>this.props.cropDropdownClicked({})} 
          className={styles['crop-dropdown-button']}>
            Crops 
            <div 
              className={styles[this.props.cropDropdownVisible ? 
                'crop-dropdown-content' : 'hidden']}>
                {cropList}
            </div>
        </div>
        
      </div>
    )
  }
})
