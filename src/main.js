import React from 'react';
import ReactDOM from 'react-dom';
import {Container} from 'cerebral-view-react';
import App from './components/App/';
import controller from './controller';

ReactDOM.render(
  <Container controller={controller}>
    <App />
  </Container>, document.querySelector('#root'))
