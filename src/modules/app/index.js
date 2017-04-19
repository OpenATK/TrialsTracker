import stateTree from './stateTree.js';

import { 
  addGeohashes,
  getYieldData,
  initialize,
  removeGeohashes,
  clearCache,
  updateOadaYieldDomain,
  updateOadaFieldsDomain,
  submitDataSourceSettings,
  cancelDataSourceSettings,
  displayDataSourceSettings,
  toggleCropLayerVisibility,
  setFieldsSource,
  setYieldSource,
} from './chains';

import { 
  toggleMenuDropdown,
  downloadNotes,
  toggleMapLegend,
} from '../MenuBar/chains';

export default {

  state : stateTree,

  signals: {

    init: initialize,

    toggleCropLayer: toggleCropLayerVisibility,

    markerDragStarted: startMarkerDrag,

    yieldSourceButtonClicked: setYieldSource,

    fieldsSourceButtonClicked: setFieldsSource,

    dataSourcesSubmitClicked: submitDataSourceSettings,

    dataSourcesCancelClicked: cancelDataSourceSettings,

    yieldOadaDomainChanged: {
      chain: [...updateOadaYieldDomain],
      immediate: true,
    },

    fieldsOadaDomainChanged: {
      chain: [...updateOadaFieldsDomain],
      immediate: true,
    },

    clearCacheButtonClicked: clearCache,

    tileUnloaded: removeGeohashes,

    newTileDrawn: addGeohashes,
  
    fieldNoteClicked: handleFieldNoteClick,

    dataSourcesButtonClicked: displayDataSourceSettings,

    menuBackgroundClicked: toggleMenuDropdown,

    showMenuDropdown: toggleMenuDropdown,

    downloadNotesButtonClicked: downloadNotes,

    mapLegendButtonClicked: toggleMapLegend,
  }
}
