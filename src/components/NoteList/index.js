import React from 'react'
import {connect} from '@cerebral/react'
import Note from '../Note/'
import FieldNote from '../FieldNote/'
import Header from './Header'
import './styles.css'
import {Tabs, Tab, FloatingActionButton} from 'material-ui';
import SwipeableViews from 'react-swipeable-views';
import {state, signal } from 'cerebral/tags'
import ContentAdd from 'material-ui/svg-icons/content/add';
import _ from 'lodash'

export default connect({
  notes: state`Note.notes`, 
  tags: state`App.model.tags`,
  sortMode: state`App.view.sort_mode`, 
  isMobile: state`App.is_mobile`,
  editing: state`App.view.editing`,
  selectedNote: state`Note.selected_note`,
  fields: state`Fields`,

  sortingTabClicked: signal`Note.sortingTabClicked`,
  noteListClicked: signal`Note.noteListClicked`,
  addNoteButtonClicked: signal`Note.addNoteButtonClicked`,
  doneClicked: signal`Note.doneEditingButtonClicked`,
},

class NoteList extends React.Component {

  handleClick(evt) {
    // call only for note-list element, not children note elements;
    if (!this.props.editing) {
      if (evt.target.className.substring(0, 9).indexOf('note-list') >= 0) {
        this.props.noteListClicked({});
      }
    }
  }

	render() {
		console.log(_.values(this.props.notes))
		let notes_array = _.sortBy(_.values(this.props.notes), 'order').map(obj => {
			console.log(obj)
			return <Note 
        id={obj.id} 
        key={obj.id}
      />}
    );

    let fields_array = Object.keys(this.props.fields || {}).map((field) => {
      return(<FieldNote 
        id={field} 
        key={field}
      />)  
    })

    return (
      <div 
				className={'note-list'}>
				<Header />
        <SwipeableViews
          index={this.props.sortMode}
          onChangeIndex={(val) => this.props.sortingTabClicked({newSortMode: val})}>
          <div
            className={'notes-container'}
            onTouchTap={(evt) => {this.handleClick(evt)}}>
            <div
              className={this.props.editing ? 'hidden' : 'add-note'}
              onTouchTap={(e) => this.props.addNoteButtonClicked({drawMode: true})}>
              Create a new note...
            </div>
            {notes_array} 
          </div>
          <div
            className={'notes-container'}>
            {fields_array} 
          </div>
          <div>
            TAG CARDS
          </div>
        </SwipeableViews>
        <FloatingActionButton
          className={'add-note-button'}
          style={(this.props.editing && this.props.sortMode === 0) ? {display: 'none'} : null}
          onTouchTap={(e) => this.props.addNoteButtonClicked({drawMode: true})}>
          <ContentAdd />
        </FloatingActionButton>
      </div>
    );
  }
})
