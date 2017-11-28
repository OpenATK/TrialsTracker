import React from 'react'
import {render} from 'react-dom'
import {Container} from '@cerebral/react';
import App from './components/App/';
import controller from './controller';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import injectTapEventPlugin from 'react-tap-event-plugin';
injectTapEventPlugin();
import './index.css'

render((
  <Container controller={controller}>
  <MuiThemeProvider>
    <App />
  </MuiThemeProvider>
  </Container>
), document.querySelector('#root'))
