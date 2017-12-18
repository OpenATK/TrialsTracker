import React from 'react'
import {connect} from '@cerebral/react'
import Note from '../Note/genericNote.js'
import Header from './Header'
import './styles.css'
import {FloatingActionButton} from 'material-ui';
import SwipeableViews from 'react-swipeable-views';
import {state, signal } from 'cerebral/tags'
import ContentAdd from 'material-ui/svg-icons/content/add';

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
    let notes_array = Object.keys(this.props.notes).map((key) => {
			let comparisons = Object.keys(this.props.notes[key].fields).map((field) => {
				return {
					text: field,
					stats: this.props.fields[field].stats,
					comparison: this.props.notes[key].fields[field]
				}
			})
			return (<Note 
        id={key} 
				key={key}
				comparisons={comparisons}
				color={this.props.notes[key].color}
				area={this.props.notes[key].geometry.area}
				type='note'
				path={`Note.notes.${key}`}
				selected={this.props.notes[key].selected}
				text={this.props.notes[key].text}
				stats={this.props.notes[key].stats}
      />)
    });

		let fields_array = Object.keys(this.props.fields || {}).map((field) => {
			let comparisons = [];
      Object.keys(this.props.notes).forEach((id) => {                          
				if (this.props.notes[id].fields[field]) comparisons.push({
					text: this.props.notes[id].text,
					stats: this.props.notes[id].stats,
					comparison: this.props.notes[id].fields[field]
				}) 
			})
      return(<Note 
        id={field} 
				key={field}
				comparisons={comparisons}
				area={this.props.fields[field].boundary.area}
				type='field'
				path={`Fields.${field}`}
				text={field}
				stats={this.props.fields[field].stats}
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
