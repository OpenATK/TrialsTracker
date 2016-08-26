import React, { PropTypes } from 'react';
import {connect} from 'cerebral-view-react';
import NoteList from '../NoteList/';
import TrialsMap from '../Map';
import styles from './app.css'

export default connect({

}, {
  init: 'app.init',
  clearCache: 'app.clearCacheButtonClicked',
},

  class App extends React.Component {
 
    componentWillMount() {
      this.props.init({});
    }

    render() {
      return (
        <div className="app">
          <NoteList />
          <TrialsMap />
          <button
            type="button"
            className={styles["clear-cache-button"]}
            onClick={() => {this.props.clearCache({})}}>
              Clear Cache
          </button>
        </div>
      )
    }
  }
)
