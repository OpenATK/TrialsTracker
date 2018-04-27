import stateTree from './stateTree.js';
import { Module } from 'cerebral';

import { 
  initialize,
} from './chains';

export default {

  state : stateTree,

  signals: {
    init: initialize,
  }
}
