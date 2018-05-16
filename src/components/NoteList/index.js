import React from 'react'
import {connect} from '@cerebral/react'
import Note from '../Note'
import Header from './Header'
import './styles.css'
import {FloatingActionButton} from 'material-ui';
import SwipeableViews from 'react-swipeable-views';
import {state, signal } from 'cerebral/tags'
import ContentAdd from 'material-ui/svg-icons/content/add';
import _ from 'lodash';

export default connect({
  notes: state`notes.notes`, 
  tags: state`app.model.tags`,
  sortMode: state`app.view.sort_mode`, 
  isMobile: state`app.is_mobile`,
  editing: state`app.view.editing`,
  selectedNote: state`notes.selected_note`,
  fields: state`fields`,

	init: signal`notes.init`,
  sortingTabClicked: signal`notes.sortingTabClicked`,
  noteListClicked: signal`notes.noteListClicked`,
  addNoteButtonClicked: signal`notes.addNoteButtonClicked`,
},

class NoteList extends React.Component {

	componentWillMount() {
		this.props.init({});
	}
	
	
	handleClick(evt) {
    // call only for note-list element, not children note elements;
    if (!this.props.editing) {
      if (evt.target.className.substring(0, 9).indexOf('note-list') >= 0) {
        this.props.noteListClicked({});
      }
    }
  }

	render() {
		//TODO: either make this a computed, or put this into actions
		let sorted_notes = _.sortBy(Object.keys(this.props.notes || {}).map(key => 
			this.props.notes[key]), ['date'])
    let notes_array = sorted_notes.map((note, i) => {
			let comparisons = Object.keys(note.fields || {}).map((field) => {
				return {
					text: field,
					stats: this.props.fields[field].stats,
					comparison: note.fields[field]
				}
			})
			return (<Note 
				order={i}
        id={note.id} 
				key={'notekey'+note.id}
				comparisons={comparisons}
				color={note.color}
				area={note.geometry && note.geometry.area ? note.geometry.area : ''}
				type='note'
				path={`notes.notes.${note.id}`}
				selected={this.props.selectedNote === note.id|| false}
				text={note.text || ''}
				stats={note.stats}
      />)
    });

		let fields_array = Object.keys(this.props.fields || {}).map((field) => {
			let comparisons = [];
      Object.keys(this.props.notes || {}).forEach((id) => {                          
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
				path={`fields.${field}`}
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
