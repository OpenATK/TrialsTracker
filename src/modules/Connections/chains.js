import {state, props} from 'cerebral/tags'
import putInPouch from '../App/factories/putInPouch';
import oadaIdClient from 'oada-id-client';
import getFromPouch from '../App/factories/getFromPouch';
import { set } from 'cerebral/operators';
import { getOadaYieldData } from '../Yield/chains.js'
import getOadaFields from '../Fields/actions/getOadaFields'
import setFieldBoundaries from '../Fields/actions/setFieldBoundaries'
import { handleFields } from '../Fields/chains'
import axios from 'axios'

export var getOadaTokenSequence = [
  getFromPouch('Connections.oada_token'), {
    success: [
      set(state`Connections.oada_token`, props`result.doc.val`),
      testOadaToken, {
        success: [],
        error: [
          getOadaToken, {
            success: [
              set(state`Connections.oada_token`, props`token`),
              putInPouch('Connections.oada_token'),
            	...getOadaYieldData,
            ],
            error: [],
          },
        ],
      },
    ],
    error: [
      getOadaToken, {
        success: [
          set(state`Connections.oada_token`, props`token`),
          putInPouch('Connections.oada_token'),
          ...getOadaYieldData,
        ],
        error: [],
      },
    ],
  },
]

export let getConnections = [
  getFromPouch('Connections.oada_domain'), {
    success: [  
      set(state`Connections.oada_domain`, props`result.doc.val`), 
      getFromPouch('Connections.oada_token'), {
				success: [
					...getOadaTokenSequence,
        ],
        error: [set(state`Connections.open`, true)],
      },
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
	getOadaTokenSequence,
	getOadaYieldData,
  //  getOadaFields, {
  //    success: [setFieldBoundaries, handleFields],
  //    error: [],
  //  },
];

export var cancelConnection = [
  set(state`Connections.open`, false),
  set(state`Connections.oada_domain`, state`Connections.oada_domain`),
]

export var showConnections = [
  set(state`Connections.open`, true),
]

function testOadaToken({state, path}) {
  var domain = state.get('Connections.oada_domain');
  var token = state.get('Connections.oada_token');
  var url = 'https://'+domain+'/bookmarks/';
  return axios({
    method: 'GET', 
    url,
    headers: {'Authorization': 'Bearer '+ token },
  }).then(function(response) {
    return path.success({});
  }).catch(function(err) {
    console.log(err)
    return path.error({});
  })
}

function getOadaToken({state, path}) {
  var options = {
    metadata: 'eyJqa3UiOiJodHRwczovL2lkZW50aXR5Lm9hZGEtZGV2LmNvbS9jZXJ0cyIsImtpZCI6ImtqY1NjamMzMmR3SlhYTEpEczNyMTI0c2ExIiwidHlwIjoiSldUIiwiYWxnIjoiUlMyNTYifQ.eyJyZWRpcmVjdF91cmlzIjpbImh0dHBzOi8vdHJpYWxzdHJhY2tlci5vYWRhLWRldi5jb20vb2F1dGgyL3JlZGlyZWN0Lmh0bWwiLCJodHRwOi8vbG9jYWxob3N0OjgwMDAvb2F1dGgyL3JlZGlyZWN0Lmh0bWwiXSwidG9rZW5fZW5kcG9pbnRfYXV0aF9tZXRob2QiOiJ1cm46aWV0ZjpwYXJhbXM6b2F1dGg6Y2xpZW50LWFzc2VydGlvbi10eXBlOmp3dC1iZWFyZXIiLCJncmFudF90eXBlcyI6WyJpbXBsaWNpdCJdLCJyZXNwb25zZV90eXBlcyI6WyJ0b2tlbiIsImlkX3Rva2VuIiwiaWRfdG9rZW4gdG9rZW4iXSwiY2xpZW50X25hbWUiOiJUcmlhbHMgVHJhY2tlciIsImNsaWVudF91cmkiOiJodHRwczovL2dpdGh1Yi5jb20vT3BlbkFUSy9UcmlhbHNUcmFja2VyIiwiY29udGFjdHMiOlsiU2FtIE5vZWwgPHNhbm9lbEBwdXJkdWUuZWR1PiJdLCJzb2Z0d2FyZV9pZCI6IjVjYzY1YjIwLTUzYzAtNDJmMS05NjRlLWEyNTgxODA5MzM0NCIsInJlZ2lzdHJhdGlvbl9wcm92aWRlciI6Imh0dHBzOi8vaWRlbnRpdHkub2FkYS1kZXYuY29tIiwiaWF0IjoxNDc1NjA5NTkwfQ.Qsve_NiyQHGf_PclMArHEnBuVyCWvH9X7awLkO1rT-4Sfdoq0zV_ZhYlvI4QAyYSWF_dqMyiYYokeZoQ0sJGK7ZneFwRFXrVFCoRjwXLgHKaJ0QfV9Viaz3cVo3I4xyzbY4SjKizuI3cwfqFylwqfVrffHjuKR4zEmW6bNT5irI',
    //    scope: 'yield-data field-notes field-boundaries',
    scope: 'oada.awesome:all',
//      params: {
//        "redirect_uri": 'https://trialstracker.oada-dev.com/oauth2/redirect.html', 
      "redirect": 'http://localhost:8000/oauth2/redirect.html',
//      }
  }
  var domain = state.get('Connections.oada_domain'); //TODO: don't hard code this as the source of the domain
  return new Promise((resolve) => {
    oadaIdClient.getAccessToken(domain, options, function(err, accessToken) {
      if (err) { console.dir(err); return resolve(path.error(err)); } // Something went wrong  
      return resolve(path.success({token:accessToken.access_token}));
    })
  })
}


