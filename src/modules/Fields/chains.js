import { getOadaTokenSequence } from '../Connections/chains';
import setFieldBoundingBoxes from './actions/setFieldBoundingBoxes';
import computeFieldBoundingBoxes from './actions/computeFieldBoundingBoxes';
import setFieldBoundaries from './actions/setFieldBoundaries';
import getFieldStats from './actions/getFieldStats';
import setFieldStats from './actions/setFieldStats';
import setFieldDataForNotes from './actions/setFieldDataForNotes';
import getFieldDataForNotes from './actions/getFieldDataForNotes';
import getOadaFields from './actions/getOadaFields';

export var computeFieldYieldData = [
  getFieldStats, {
    success: [
      setFieldStats,
      getFieldDataForNotes, {
        success: [setFieldDataForNotes],
        error: [],
      }
    ],
    error: [],
  },
];

export let handleFields = [
  computeFieldBoundingBoxes, {
    success: [setFieldBoundingBoxes, computeFieldYieldData],
    error: [],
  },
]

export let getFieldBoundaries = [
  getOadaTokenSequence, {
    success: [],
    error: [],
  },
  getOadaFields, {
    success: [setFieldBoundaries, handleFields],
    error: [],
  },
];
