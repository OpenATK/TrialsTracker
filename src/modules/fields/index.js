import { Module } from 'cerebral'
import {
  selectField
} from './sequences'
export default Module({

	state : {
		records: {},
		loading: true,
	},

	signals: {
		fieldClicked: selectField,
  }
})
