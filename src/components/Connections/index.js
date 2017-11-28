import React from 'react'
import { connect } from '@cerebral/react'
import { TextField, FlatButton, Dialog } from 'material-ui'
import './datasource-settings.css'
import { state, signal } from 'cerebral/tags'
import styles from './styles.css'

export default connect({
  oadaDomainText: state`Connections.oada_domain_text`,
  open: state`Connections.open`,

  submitClicked: signal`Connections.submitClicked`,
  cancelClicked: signal`Connections.cancelClicked`,
  oadaDomainChanged: signal`Connections.oadaDomainChanged`,
},

	class Connections extends React.Component {

	render() {
		 const actions = [
      <FlatButton
        label="Cancel"
        primary={true}
				onClick={()=>{this.props.cancelClicked({})}}
      />,
      <FlatButton
        label="Submit"
        primary={true}
        keyboardFocused={true}
				onClick={()=>{this.props.submitClicked({})}}
      />,
    ];
		return(
			<Dialog
        title="At what OADA domain is your data stored?"
        actions={actions}
        modal={false}
        open={this.props.open}
				onRequestClose={()=>{this.props.cancelClicked({})}}>
				<div className='connections-content'>
          <TextField
            value={this.props.oadaDomainText} 
            hintText="yield.oada-dev.com"
            onChange={(e) => this.props.oadaDomainChanged({value: e.target.value})}
				  />
			  </div>
		  </Dialog>
    )
  }
})
