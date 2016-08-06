import React, { PropTypes } from 'react';
import {connect} from 'cerebral-view-react';
import NoteList from '../NoteList/';
import TrialsMap from '../Map';

export default connect({

}, {
  init: 'app.init',
},

  class App extends React.Component {
 
    componentWillMount() {
    //  this.props.init({});
    }

    render() {
      return (
        <div className="app">
          <NoteList />
          <TrialsMap />
        </div>
      )
    }
  }
)
