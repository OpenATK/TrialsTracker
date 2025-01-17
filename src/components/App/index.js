import React from 'react';
import {connect} from '@cerebral/react';
import NoteList from '../NoteList/generic.js';
import TrialsMap from '../Map';
import MenuBar from '../MenuBar';
import Connections from '../Connections';
import './app.css';
import { signal } from 'cerebral/tags'

export default connect({

  init: signal`App.init`,
},

class App extends React.Component {
 
  componentWillMount() {
		this.props.init({});
  }

  render() {
    return (
      <div className={'app'}>
				<Connections />
        <div className={'map-menu'}>
          <MenuBar />
					<TrialsMap />
				</div>
				<NoteList />
      </div>
    )
  }
})
