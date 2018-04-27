import { Module } from 'cerebral'
import {
  selectField
} from './sequences'
export default Module({

	state : {

	},

	signals: {
		fieldClicked: selectField,
  }
})
