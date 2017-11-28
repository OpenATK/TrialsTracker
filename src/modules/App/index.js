import stateTree from './stateTree.js';

import { 
  addGeohashes,
  initialize,
  removeGeohashes,
} from './chains';

export default {

  state : stateTree,

  signals: {
    init: initialize,
    newTileDrawn: addGeohashes,
    tileUnloaded: removeGeohashes,
  }
}
