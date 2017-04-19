import React from 'react';
import { connect } from 'cerebral/react';
import './menu-bar.css';
import FontAwesome from 'react-fontawesome';
import { state, signal } from 'cerebral/tags'

export default connect({
  dataIndex: state`app.model.yield_data_index`,
  currentLocation: state`app.model.current_location`,
  selectedNote: state`app.view.selected_note`,
  menuDropdownVisible: state`app.view.menu_dropdown_visible`,
  editing: state`app.view.editing_note`,
  isMobile: state`app.is_mobile`,
  notes: state`app.model.notes`,
  legendVisible: state`app.view.legend.visible`,

  dataSourcesButtonClicked: signal`app.dataSourcesButtonClicked`,
  clearCacheButtonClicked: signal`app.clearCacheButtonClicked`,
  gpsButtonClicked: signal`map.currentLocationButtonClicked`,
  backgroundClicked: signal`app.menuBackgroundClicked`,
  showMenuDropdown: signal`app.showMenuDropdown`,
  downloadNotes: signal`app.downloadNotesButtonClicked`,
  undoButtonClicked: signal`map.undoButtonClicked`,
  mapLegendButtonClicked: signal`app.mapLegendButtonClicked`,
},

class MenuBar extends React.Component {

  render() {
    var undoEnabled = this.props.selectedNote ?
      this.props.notes[this.props.selectedNote].geometry.geojson.coordinates[0].length > 0 : false;
    return (
      <div className={'menu-bar'}>
        {this.props.menuDropdownVisible ? <div
          onClick={() => {this.props.backgroundClicked({})}}
          className={'menu-dropdown-container'}>
          <div
            className={'menu-dropdown'}>
            <span
              onClick={()=>this.props.clearCacheButtonClicked({})}>
              Clear Cache 
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
          className={'overflow-button'}
          onClick={()=>{this.props.showMenuDropdown()}}
        />
        {Object.keys(this.props.dataIndex).length > 0 ? <FontAwesome
          name='info'
          onClick={() => this.props.mapLegendButtonClicked({})}
          className={'info-button'}
        /> : null }
        {this.props.isMobile ? <FontAwesome
          name='crosshairs'
          disabled={this.props.currentLocation ? true : false}
          onClick={() => this.props.gpsButtonClicked({})}
          className={this.props.currentLocation ? 
           'gps-control' : 'gps-control-disabled'}
        /> : null }
        {this.props.isMobile ? <FontAwesome
          name='undo'
          className={this.props.editing ? 
            (undoEnabled ? 'undo-control' : 'undo-control-disabled') : 'hidden'}
          onClick={() => this.props.undoButtonClicked({})}
        /> : null }
      </div>
    )
  }
})
