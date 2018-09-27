import React from 'react'
import {connect} from '@cerebral/react'
import Note from '../Note'
import Header from './Header'
import './styles.css'
import {FloatingActionButton} from 'material-ui';
import SwipeableViews from 'react-swipeable-views';
import {state, signal } from 'cerebral/tags'
import ContentAdd from 'material-ui/svg-icons/content/add';
import LoadingScreen from '../LoadingScreen';
import _ from 'lodash';

export default connect({
  notes: state`notes.notes`, 
  tags: state`model.tags`,
  tab: state`notes.tab`, 
  isMobile: state`view.is_mobile`,
  editing: state`view.editing`,
	fields: state`notes.fields`,
	loading: state`notes.loading`,

  tabClicked: signal`notes.tabClicked`,
  noteListClicked: signal`notes.noteListClicked`,
  addNoteButtonClicked: signal`notes.addNoteButtonClicked`,
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
		//TODO: either make this a computed, or put this into actions
		//		let notesArray = _.sortBy(_.toPairs(this.props.notes), 1.date)
		let self = this;
    let sorted_notes = _.sortBy(Object.keys(this.props.notes || {}), [function(key) {
			return self.props.notes[key].created}]).reverse();
		let notes = sorted_notes.map((key, i) => {
			let comparisons = Object.keys(this.props.notes[key].fields || {}).map((field) => {
				return {
					text: field,
					stats: this.props.fields[field].stats,
					comparison: this.props.notes[key].fields[field]
				}
			})
			return (<Note 
				order={i}
        id={key} 
				key={'notekey'+key}
				type='notes'
				comparisons={comparisons}
      />)
    });


		let fields = Object.keys(this.props.fields || {}).map((field) => {
			let comparisons = [];
      Object.keys(this.props.notes || {}).forEach((id) => {
				if (this.props.notes[id].fields && this.props.notes[id].fields[field]) comparisons.push({
					text: this.props.notes[id].text,
					stats: this.props.notes[id].stats,
					comparison: this.props.notes[id].fields[field]
				}) 
			})
			return(<Note 
				order={this.props.fields[field].stats && !_.isEmpty(this.props.fields[field].stats) ? 0 : 1}
        id={field} 
				key={'notekey'+field}
				type='fields'
				comparisons={comparisons}
      />)  
    })

    return (
      <div 
				className={'note-list'}>
				<Header />
        <SwipeableViews
          index={this.props.tab}
          onChangeIndex={(tab) => this.props.tabClicked({tab})}>
          <div
            className={'notes-container'}
            onClick={(evt) => {this.handleClick(evt)}}>
            <div
              className={this.props.editing ? 'hidden' : 'add-note'}
              onClick={(e) => this.props.addNoteButtonClicked({type: 'notes'})}>
              Create a new note...
            </div>
            {notes} 
          </div>
          <div
            className={'notes-container'}>
            <div
              className={this.props.editing ? 'hidden' : 'add-note'}
              onClick={(e) => this.props.addNoteButtonClicked({type:'fields'})}>
              Create a new field...
            </div>
            {fields} 
          </div>
          <div>
            TAG CARDS
          </div>
        </SwipeableViews>
        <FloatingActionButton
          className={'add-note-button'}
          style={(!this.props.editing && this.props.tab === 0 && this.props.isMobile) ? {} : {display: 'none'}}
          onClick={(e) => this.props.addNoteButtonClicked({type: this.props.tab === 0 ? 'notes': 'fields'})}>
          <ContentAdd />
				</FloatingActionButton>
				{this.props.loading ? <LoadingScreen /> : null}
      </div>
    );
  }
})
