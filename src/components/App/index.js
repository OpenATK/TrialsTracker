import React from 'react';
import {connect} from 'cerebral/react';
import NoteList from '../NoteList/';
import TrialsMap from '../Map';
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
        <NoteList />
        <TrialsMap />
      </div>
    )
  }
})
