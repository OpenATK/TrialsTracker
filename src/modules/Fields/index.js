import { Module } from 'cerebral'
import {
  selectField
} from './chains'
export default {

	state : {

	},

	signals: {
		fieldClicked: selectField,
  }
}
