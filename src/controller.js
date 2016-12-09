import { Controller } from 'cerebral';
import Model from 'cerebral/models/immutable'

import App from './modules/app'
import Devtools from 'cerebral-module-devtools'
import Router from 'cerebral-module-router'
import Forms from 'cerebral-module-forms'
import pouchdb from 'cerebral-module-pouchdb'
import http from 'cerebral-module-http'

const controller = Controller(Model({}))

controller.addModules({
  app: App,

  devtools: Devtools(),
  forms: Forms({
    rules: {}
  }),
//  db: pouchdb({
//    rootPath: ['docs'],   // optional - defaults to store docs in the module state
//    readonly: false,      // optional - defaults to false will not sync client to server when true
//    localDb: 'TrialsTracker',   // optional - local db will sync with state when provided
//    remoteDb: 'http://localhost/db/myappdb',  // optional - syncs with remote db when provided
//    documentTypes: ['user', 'invoice']        // optional - defaults to all document types
//  }),
  router: Router({
//    '/': 'app.rootRouted',
//    '/:filter': 'app.filterClicked'
  }, {
    onlyHash: true
  })
})

export default controller
