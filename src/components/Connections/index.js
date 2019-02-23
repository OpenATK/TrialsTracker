import React from 'react'
import { connect } from '@cerebral/react'
import { TextField, FlatButton, Dialog } from 'material-ui'
import { state, signal } from 'cerebral/tags'
import './connections.css'
import isValidDomain from 'is-valid-domain'
import {orange500} from 'material-ui/styles/colors';

export default connect({
  domain: state`connections.connection.domain`,
  open: state`connections.open`,

  submitClicked: signal`connections.submitClicked`,
  cancelClicked: signal`connections.cancelClicked`,
  oadaDomainChanged: signal`connections.oadaDomainChanged`,
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
        title="Do you have an OADA provider?"
        actions={actions}
        modal={false}
				open={this.props.open}
				contentClassName={'content'}
				className={'connections-dialog'}
        onRequestClose={()=>{this.props.cancelClicked({})}}>
          {isValidDomain(this.props.domain) ? 
          <TextField
            value={this.props.domain} 
            hintText="oada.openatk.com"
            onChange={(e) => this.props.oadaDomainChanged({value: e.target.value})}
          /> : 
          <TextField
            value={this.props.domain} 
            hintText="oada.openatk.com"
            onChange={(e) => this.props.oadaDomainChanged({value: e.target.value})}
            errorText="Enter valid domain name"
            errorStyle={{color:orange500}}
          />}
		  </Dialog>
    )
  }
})
