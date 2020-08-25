import React from 'react';
import {connect} from '@cerebral/react';
import NoteList from '../NoteList';
import TrialsMap from '../Map';
import MenuBar from '../MenuBar';
import Connections from '../Connections';
import LiveDemoToolbar from '../LiveDemoToolbar';
import './app.css';
import { signal, state } from 'cerebral/tags'

export default connect({
  showLiveDemoToolbar: state`livedemo.running`,
  showConnectionsDialog: state`connections.open`,
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
          {this.props.showConnectionsDialog ? <Connections /> : null}
          {this.props.showLiveDemoToolbar ? <LiveDemoToolbar /> : null}
					<TrialsMap />
				</div>
				<NoteList />
      </div>
    )
  }
})
