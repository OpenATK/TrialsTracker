import React, { PropTypes } from 'react';
import {connect} from 'cerebral-view-react';
import NoteList from '../NoteList/';
import TrialsMap from '../Map';
import OadaDomainModal from '../OadaDomainModal';
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
        <div className="app">
          <OadaDomainModal />
          <NoteList />
          <TrialsMap />
          <button
            type="button"
            className={styles["clear-cache-button"]}
            onClick={() => {this.props.clearCache({})}}>
              Clear Cache
          </button>
          <button
            type="button"
            className={styles["set-domain-button"]}
            onClick={() => {this.props.showDomainModal({})}}>
              Change Domain
          </button>
        </div>
      )
    }
  }
)
