import React from 'react';
import { connect } from 'cerebral-view-react';
import styles from './menu-bar.css';
import FontAwesome from 'react-fontawesome';

export default connect({
  dataIndex: 'app.model.yield_data_index',
  currentLocation: 'app.model.current_location',
  selectedNote: 'app.view.selected_note',
  menuDropdownVisible: 'app.view.menu_dropdown_visible',
  drawing: 'app.view.map.drawing_note_polygon',
  isMobile: 'app.is_mobile',
  notes: 'app.model.notes',
  legendVisible: 'app.view.legend.visible',
}, {
  dataSourcesButtonClicked: 'app.dataSourcesButtonClicked',
  clearCacheButtonClicked: 'app.clearCacheButtonClicked',
  gpsButtonClicked: 'app.currentLocationButtonClicked',
  backgroundClicked: 'app.menuBackgroundClicked',
  showMenuDropdown: 'app.showMenuDropdown',
  downloadNotes: 'app.downloadNotesButtonClicked',
  undoButtonClicked: 'app.undoButtonClicked',
  mapLegendButtonClicked: 'app.mapLegendButtonClicked',
},

class MenuBar extends React.Component {

  render() {
    var undoEnabled = this.props.selectedNote ?
      this.props.notes[this.props.selectedNote].geometry.geojson.coordinates[0].length > 0 : false;
    return (
      <div className={styles['menu-bar']}>
        {this.props.menuDropdownVisible ? <div
          onClick={() => {this.props.backgroundClicked({})}}
          className={styles['menu-dropdown-container']}>
          <div
            className={styles['menu-dropdown']}>
            <span
              onClick={()=>this.props.clearCacheButtonClicked({})}>
              Sign Out
            </span>
            <br/>
            <span
              onClick={()=>this.props.dataSourcesButtonClicked({})}>
              Change Data Sources
            </span>
            <br/>
            <span
              onClick={()=>this.props.downloadNotes({})}>
              Download Notes 
            </span>
          </div>
        </div> : null }
        <FontAwesome
          name='ellipsis-v'
          className={styles['overflow-button']}
          onClick={()=>{this.props.showMenuDropdown()}}
        />
        {Object.keys(this.props.dataIndex).length > 0 ? <FontAwesome
          name='info'
          onClick={() => this.props.mapLegendButtonClicked({})}
          className={styles['info-button']}
        /> : null }
        {this.props.isMobile ? <FontAwesome
          name='crosshairs'
          disabled={this.props.currentLocation ? true : false}
          onClick={() => this.props.gpsButtonClicked({})}
          className={styles[this.props.currentLocation ? 
           'gps-control' : 'gps-control-disabled']}
        /> : null }
        {this.props.isMobile ? <FontAwesome
          name='undo'
          className={styles[this.props.drawing ? 
            (undoEnabled ? 'undo-control' : 'undo-control-disabled') : 'hidden']}
          onClick={() => this.props.undoButtonClicked({})}
        /> : null }
      </div>
    )
  }
})
