import React from 'react';
import ReactDOM from 'react-dom';
import * as serviceWorker from './serviceWorker';
import 'semantic-ui-css/semantic.min.css'

import './index.css';

import App from './view/App'

import { createOvermind } from "overmind";
import { Provider } from "overmind-react";
import { config } from "./overmind"

const app = createOvermind(config, {devtools: false});

ReactDOM.render(
  <Provider value={app}>
    <App />
  </Provider>,
  document.getElementById('root')
)

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
