import React from 'react';
import {connect} from '@cerebral/react';
import { CircularProgress } from 'material-ui';
import './styles.css'

export default connect({
},

class LoadingScreen extends React.Component {
 
  render() {
    return (
      <div className={'loading-screen'}>
				<CircularProgress
					left={0}
					top={0}
					size={40}
					status='loading'
				/>
      </div>
    )
  }
})
