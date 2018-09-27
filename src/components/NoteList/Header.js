import React from 'react'
import {connect} from '@cerebral/react'
import './styles.css'
import {Tabs, Tab} from 'material-ui';
import {state, signal } from 'cerebral/tags'

export default connect({
  tab: state`notes.tab`,
  isMobile: state`view.is_mobile`,
  editing: state`view.editing`,
  selectedNote: state`notes.selected_note`,

  tabClicked: signal`notes.tabClicked`,
  doneClicked: signal`notes.doneClicked`,
},

class Header extends React.Component {

  handleClick(evt) {
    // call only for note-list element, not children note elements;
    if (!this.props.editing) {
      if (evt.target.className.substring(0, 9).indexOf('note-list') >= 0) {
        this.props.noteListClicked({});
      }
    }
  }

  render() {
    return (
      <div 
				className={'note-list-header'}>
				{this.props.editing ? 
        <Tabs
          onClick={() => this.props.doneClicked({id:this.props.selectedNote.id})}
          value={0}>
					<Tab 
						label="DONE" 
						tabIndex={3}
						value={0} 
					/>
				</Tabs>
				:
        <Tabs
          onChange={(tab) => this.props.tabClicked({tab})}
          value={this.props.tab}>
          <Tab label="NOTES" value={0} />
          <Tab label="FIELDS" value={1} />
          {/*<Tab label="TAGS" value={2} />*/}
				</Tabs>
				}
			</div>
		)
	}
})
