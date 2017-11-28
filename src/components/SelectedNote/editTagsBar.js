import React from 'react';
import { connect } from '@cerebral/react';
import uuid from 'uuid';
import './editTagsBar.css'
import { Chip } from 'material-ui'
import { state, signal } from 'cerebral/tags'

export default connect({
    allTags: state`App.model.tags`,
    editing: state`App.view.editing`,
    tagInput: state`App.model.tag_input_text`,

    tagAdded: signal`note.tagAdded`,
    tagRemoved: signal`note.tagRemoved`,
    tagInputTextChanged: signal`note.tagInputTextChanged`,
},

  class EditTagsBar extends React.Component {

    componentWillMount() {
      this.handleKeyDown = this.handleKeyDown.bind(this);
    }
  
    handleKeyDown(evt) {
      if (evt.keyCode === 13 || evt.keyCode === 9) {
        this.props.tagAdded({text: evt.target.value});
      }
    }
  
		render() {
      var options = [];
      
      var id = uuid.v4();

      return (
        <div
          className={((this.props.editing && this.props.selected) || this.props.tags.length > 0) ? 
            'edit-tags-bar' : 'hidden'}>
          <datalist id={id}>
						{Object.keys(this.props.allTags).filter(tag => this.props.tags.indexOf(tag) < 0
						).map(tag => 
							<option key={uuid.v4()} value={tag}>{tag} </option>
						)}
          </datalist>
          <input 
            className={this.props.editing && this.props.selected ? 
              'input' : 'hidden'}
            placeholder='Add a new tag...'
            style={{border: 'none'}}
            list={id}
            autoComplete='on'
            onChange={(e) => this.props.tagInputTextChanged({value: e.target.value, noteId:this.props.id})}
            value={this.props.tagInput}
            onKeyDown={this.handleKeyDown}
          />
					{this.props.selected && this.props.editing ? this.props.tags.map(tag => 
					  <Chip
              key={this.props.id + tag} 
							onRequestDelete={() => this.props.tagRemoved({tag})} 
						  className={'tag'}>
						  {tag}
						</Chip>) 
					: this.props.tags.map(tag => 
					  <Chip
              key={this.props.id + tag} 
						  className={'tag'}>
						  {tag}
						</Chip>) 
					}
        </div>
      )
    }
  }
) 
