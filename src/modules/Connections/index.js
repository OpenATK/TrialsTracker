import { Module } from 'cerebral'
import { 
  setConnection,
  cancelConnection,
	updateOadaDomain,
} from './chains';

export default {

	state : {
		open: false,
		oada_domain_text: 'https://yield.trialstracker.com',
		oada_domain: '',
	}, 

	signals: {
		submitClicked: setConnection,
		cancelClicked: cancelConnection,
		oadaDomainChanged: updateOadaDomain,
  }
}
