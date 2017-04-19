import stateTree from './stateTree.js';

import { 
  addGeohashes,
  initialize,
  removeGeohashes,
  clearCache,
  updateOadaYieldDomain,
  updateOadaFieldsDomain,
  submitDataSourceSettings,
  cancelDataSourceSettings,
  displayDataSourceSettings,
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
  
    dataSourcesButtonClicked: displayDataSourceSettings,

    menuBackgroundClicked: toggleMenuDropdown,

    showMenuDropdown: toggleMenuDropdown,

    downloadNotesButtonClicked: downloadNotes,

    mapLegendButtonClicked: toggleMapLegend,
  }
}
