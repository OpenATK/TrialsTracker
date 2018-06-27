import { props, state } from 'cerebral/tags';
import { when, set } from 'cerebral/operators';
import { sequence } from 'cerebral';
import urlLib from 'url';
import * as oada from '../oada/sequences'

export const init = sequence('datasilo.init', [
])

export const connectToDataSilo = sequence('datasilo.connectToDataSilo', [
	({}) => {
		path: '/bookmarks/services',
		contentType: 'application/vnd.oada.fields.1+json',
		data: {},
		uuid: uuid()
	},
	oada.createResourceAndLink
])
