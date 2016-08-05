import { Controller } from 'cerebral';
import Model from 'cerebral/models/immutable'
//import model from './modules/app/model';

import App from './modules/app'
import Devtools from 'cerebral-module-devtools'
import Router from 'cerebral-module-router'
import Forms from 'cerebral-module-forms'

const controller = Controller(Model({}))

controller.addModules({
  app: App,

  devtools: Devtools(),
  forms: Forms({
    rules: {}
  }),
  router: Router({
//    '/': 'app.rootRouted',
//    '/:filter': 'app.filterClicked'
  }, {
    onlyHash: true
  })
})

export default controller
