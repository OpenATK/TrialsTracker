import React from 'react';
import {connect} from '@cerebral/react';
import NoteList from '../NoteList';
import TrialsMap from '../Map';
import MenuBar from '../MenuBar';
import './app.css';
import { signal } from 'cerebral/tags'

export default connect({
  init: signal`init`,
},

class App extends React.Component {
 
  componentDidMount() {
		this.props.init({});
  }

  render() {
    return (
      <div className={'app'}>
        <div className={'map-menu'}>
          <MenuBar />
					<TrialsMap />
				</div>
				<NoteList />
      </div>
    )
  }
})
