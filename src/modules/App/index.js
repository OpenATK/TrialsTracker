import stateTree from './stateTree.js';

import { 
  initialize,
} from './chains';

export default {

  state : stateTree,

  signals: {
    init: initialize,
  }
}
