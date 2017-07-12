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

    clearCacheButtonClicked: clearCache,

    dataSourcesButtonClicked: displayDataSourceSettings,

    dataSourcesSubmitClicked: submitDataSourceSettings,

    dataSourcesCancelClicked: cancelDataSourceSettings,
 
    downloadNotesButtonClicked: downloadNotes,

    fieldsOadaDomainChanged: updateOadaFieldsDomain,

    fieldsSourceButtonClicked: setFieldsSource,

    init: initialize,

    menuBackgroundClicked: toggleMenuDropdown,

    mapLegendButtonClicked: toggleMapLegend,

    newTileDrawn: addGeohashes,
 
    showMenuDropdown: toggleMenuDropdown,

    tileUnloaded: removeGeohashes,
 
    yieldOadaDomainChanged: updateOadaYieldDomain,

    yieldSourceButtonClicked: setYieldSource,
  }
}
