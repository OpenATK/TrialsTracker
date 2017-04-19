import React, { PropTypes } from 'react';
import {connect} from 'cerebral/react';
import NoteList from '../NoteList/';
import TrialsMap from '../Map';
import DataSourceSettings from '../Settings/DataSources';
import styles from './app.css';

export default connect({

}, {
  init: 'app.init',
  clearCache: 'app.clearCacheButtonClicked',
  showDomainModal: 'app.setDomainButtonClicked',
},

class App extends React.Component {
 
  componentWillMount() {
    this.props.init({});
  }

  render() {
    return (
      <div className={styles['app']}>
        <DataSourceSettings />
        <NoteList />
        <TrialsMap />
      </div>
    )
  }
})
