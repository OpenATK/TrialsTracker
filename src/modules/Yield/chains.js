import getYieldDataIndex from './actions/getYieldDataIndex'
import setYieldDataIndex from './actions/setYieldDataIndex'
//import { getOadaTokenSequence } from '../Connections/chains'
import getFromPouch from '../App/factories/getFromPouch';
import {state, props} from 'cerebral/tags'
import putInPouch from '../App/factories/putInPouch';
import { set } from 'cerebral/operators';
import axios from 'axios'
import oadaIdClient from 'oada-id-client';

export let getOadaYieldData = [
  getYieldDataIndex, {
    success: [setYieldDataIndex],
    error: [],
	}
]

export let initializeYield = [
  getYieldDataIndex, {
    success: [setYieldDataIndex],
    error: [],
	}
]
