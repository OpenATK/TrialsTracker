import React from 'react'
import {connect} from '@cerebral/react'
import './styles.css'
import {Tabs, Tab} from 'material-ui';
import {state, signal } from 'cerebral/tags'

export default connect({
  sortMode: state`app.view.sort_mode`,
  isMobile: state`app.is_mobile`,
  editing: state`app.view.editing`,
  selectedNote: state`notes.selected_note`,

  sortingTabClicked: signal`notes.sortingTabClicked`,
  doneClicked: signal`notes.doneEditingButtonClicked`,
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
          onTouchTap={() => this.props.doneClicked({id:this.props.selectedNote})}
          value={0}>
					<Tab 
						label="DONE" 
						tabIndex={3}
						value={0} 
					/>
				</Tabs>
				:
        <Tabs
          onChange={(val) => this.props.sortingTabClicked({newSortMode: val})}
          value={this.props.sortMode}>
          <Tab label="NOTES" value={0} />
          <Tab label="FIELDS" value={1} />
          <Tab label="TAGS" value={2} />
				</Tabs>
				}
			</div>
		)
	}
})
