import React from 'react';
import ReactDOM from 'react-dom';
import Router from 'cerebral-module-router';
import Controller from 'cerebral';
import Model from 'cerebral-model-baobab';
import {Container} from 'cerebral-view-react';
import Devtools from 'cerebral-module-devtools';
import Home from './modules/Home';
import App from './components/App/';

const controller = Controller(Model({}));

controller.addModules({

  home: Home(),

  devtools: Devtools(),
  router: Router({
  }, {
    onlyHash: true
  })
});

ReactDOM.render(<Container controller={controller}><App /></Container>, document.getElementById('root'));
