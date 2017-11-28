import { 
  setConnection,
  cancelConnection,
	updateOadaDomain,
} from './chains';

export default {

	state : {
		open: false,
		oada_domain_text: '',
		oada_domain: '',
	}, 

	signals: {
		submitClicked: setConnection,
		cancelClicked: cancelConnection,
		oadaDomainChanged: updateOadaDomain,
  }
}
