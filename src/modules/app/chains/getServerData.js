import { set} from 'cerebral/operators';
import getOadaDomain from './actions/getOadaDomain.js';
import setOadaDomain from './actions/setOadaDomain.js';
import storeToken from './actions/storeToken.js';

export default [
  getOadaDomain, {
    cached: [
      set('state:app.view.server.domain', input.value)
      hideDomainModal,
      getToken, {
        success: [
          set('state:app.view.offline', false)
          set('state:app.view.server.token', input.token)
          
          storeToken,
          getFields, {
            success: [
              setFields, setNoteFields, {
                success: [computeStats],
                error: [],
              }
            ],
            error: [],
          }, 
          getAvailableYieldData, {
            success: [
              setAvailableData,
            ],
            error: [],
          }
        ],
        error: [],
      }
    ],
    offline: [],
    fail: [showDomainModal],
  }
]        
          
