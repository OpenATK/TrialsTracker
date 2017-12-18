import getYieldDataIndex from './actions/getYieldDataIndex'
import setYieldDataIndex from './actions/setYieldDataIndex'

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
