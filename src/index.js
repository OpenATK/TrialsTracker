import React from 'react'
import {render} from 'react-dom'
import {Container} from '@cerebral/react';
import App from './components/App/';
import controller from './controller';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import injectTapEventPlugin from 'react-tap-event-plugin';
import Promise from 'bluebird'
injectTapEventPlugin();
import './index.css'
global.Promise = Promise;
Promise.config({
    // Enables all warnings except forgotten return statements.
    warnings: {
        wForgottenReturn: false
    }
});

render((
  <Container controller={controller}>
  <MuiThemeProvider>
    <App />
  </MuiThemeProvider>
  </Container>
), document.querySelector('#root'))
