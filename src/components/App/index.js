import React from 'react';
import ReactDOM from 'react-dom'
import {connect} from 'cerebral/react';
import NoteList from '../NoteList/';
import TrialsMap from '../Map';
import MenuBar from '../MenuBar';
import DataSourceSettings from '../Settings/DataSources';
import './app.css';
import { signal } from 'cerebral/tags'

export default connect({

  init: signal`app.init`,
},

class App extends React.Component {
 
  componentWillMount() {
    this.props.init({});
  }

  render() {
    return (
      <div className={'app'}>
        <DataSourceSettings />
        <MenuBar />
        <NoteList />
        <TrialsMap />
      </div>
    )
  }
})
