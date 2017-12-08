import setFieldBoundingBoxes from './actions/setFieldBoundingBoxes';
import computeFieldBoundingBoxes from './actions/computeFieldBoundingBoxes';
import setFieldBoundaries from './actions/setFieldBoundaries';
import getFieldStats from './actions/getFieldStats';
import setFieldStats from './actions/setFieldStats';
import setFieldDataForNotes from './actions/setFieldDataForNotes';
import getFieldDataForNotes from './actions/getFieldDataForNotes';
import getOadaFields from './actions/getOadaFields';
import { set } from 'cerebral/operators'
import { state, props } from 'cerebral/tags'

export var computeFieldYieldData = [
  getFieldStats, {
    success: [
			setFieldStats,
			set(props`notes`, state`Note.notes`),
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
		success: [
			setFieldBoundingBoxes,
		],
    error: [],
  },
]

export let getFields = [
  getOadaFields, {
		success: [
			setFieldBoundaries,
			...handleFields
	  ],
    error: [],
	},
]

export let selectField = [

]
