import {state, props} from 'cerebral/tags'
import putInPouch from '../App/factories/putInPouch';
import getFromPouch from '../App/factories/getFromPouch';
import { set } from 'cerebral/operators';
import { parallel } from 'cerebral';
import { getOadaYieldData } from '../Yield/chains.js'
import { computeFieldYieldData, getFields } from '../Fields/chains'
import configureWebsocketProvider from './actions/configureWebsocketProvider'
import getOadaBaseURI from '../OADA/factories/getOadaBaseURI'
import getToken from '../OADA/factories/getToken'
import getOadaConfiguration from '../OADA/factories/getOadaConfiguration'
import head from '../OADA/factories/head'
import _ from 'lodash'

export var signOut = [
  set(state`Connections.oada_token`, ''),
  set(state`Connections.oada_domain`, ''),
  set(state`Connections.oada_domain_text`, ''),
]

export var getData = [
	parallel([
    ...getOadaYieldData,
		...getFields,
	]),
	...computeFieldYieldData,
]

export var getOadaTokenSequence = [
  getFromPouch('Connections.oada_token'), {
    success: [
      set(state`Connections.oada_token`, props`result.val`),
			head({domain:props`domain`, token: state`Connections.oada_token`, path: '/bookmarks'}), {
				success: [
					getOadaBaseURI({domain: props`domain`}),
         	...getData,
				],
        error: [
          getToken({domain: props`domain`}), {
            success: [
              set(state`Connections.oada_token`, props`accessToken`),
              putInPouch('Connections.oada_token'),
    					getOadaBaseURI({domain: props`domain`}),
            	...getData,
            ],
            error: [],
          },
        ],
      },
    ],
    error: [
      getToken({domain: props`domain`}), {
        success: [
          set(state`Connections.oada_token`, props`accessToken`),
          putInPouch('Connections.oada_token'),
					getOadaBaseURI({domain: props`domain`}),
          ...getData,
        ],
        error: [],
      },
    ],
  },
]

export let getConnections = [
  getFromPouch('Connections.oada_domain'), {
    success: [  
      set(state`Connections.oada_domain`, props`result.val`), 
      set(props`domain`, props`result.val`), 
			configureWebsocketProvider, {
				success: [...getOadaTokenSequence],
				error: [],
			}
    ],
    error: [
      set(state`Connections.open`, true),
    ],
  },
]

export var updateOadaDomain = [
  set(state`Connections.oada_domain_text`, props`value`),
];

export var setConnection = [
  set(state`Connections.open`, false),
  set(state`Connections.oada_domain`, state`Connections.oada_domain_text`),
  putInPouch(`Connections.oada_domain`),
  set(props`domain`, state`Connections.oada_domain`), 
	...getOadaTokenSequence,
];

export var cancelConnection = [
  set(state`Connections.open`, false),
  set(state`Connections.oada_domain`, state`Connections.oada_domain`),
]

export var showConnections = [
  set(state`Connections.open`, true),
]
