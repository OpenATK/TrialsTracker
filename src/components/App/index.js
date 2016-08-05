import React, { PropTypes } from 'react';
import {connect} from 'cerebral-view-react';
import NoteList from '../NoteList/';
import Map from '../Map';

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
          <Map />
        </div>
      )
    }
  }
)
