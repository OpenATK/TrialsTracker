import {sequence} from 'cerebral'
import { set } from 'cerebral/operators'
import {props} from 'cerebral/tags'

import doesResourceExist from '../../OADA/factories/doesResourceExist';
import createResource from '../../OADA/factories/createResource';
import showError from '../../Error/factories/showError'

export default sequence('initTrellisResource', [
  doesResourceExist({path: '/bookmarks/trellisfw'}),
  {
    yes: [],
    no: [
      createResource({
        path: '/bookmarks/trellisfw',
        contentType: 'application/vnd.trellisfw.1+json'
      })
    ],
    error: [
      showError({title: 'Error', desc: 'Failed to login.', error: props`error.message`}),
      set(props`error`, true)
    ]
  }
])
