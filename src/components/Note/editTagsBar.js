import React from 'react';
import { connect } from 'cerebral/react';
import uuid from 'uuid';
import './editTagsBar.css'
import { IconButton } from 'material-ui'
import { props, state, signal } from 'cerebral/tags'

export default connect({
  note: state`app.model.notes.${props`id`}`,
  tags: state`app.model.notes.${props`id`}.tags`,
  allTags: state`app.model.tags`,
  editing: state`app.view.editing_note`,
  selected: state`app.model.notes.${props`id`}.selected`,
  tagInput: state`app.model.tag_input_text`,

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
      var self = this;
      var options = [];
      Object.keys(this.props.allTags).forEach((tag) => {
        if (self.props.tags.indexOf(tag) < 0) {
          options.push(<option key={uuid.v4()} value={tag}>{tag} </option>);
        }
      });
      var id = uuid.v4();

      return (
        <div
          className={((this.props.editing && this.props.selected) || this.props.tags.length > 0) ? 
            'edit-tags-bar' : 'hidden'}>
          <datalist id={id}>
            {options}
          </datalist>
          <input 
            className={this.props.editing && this.props.selected ? 
              'input' : 'hidden'}
            placeholder='Add a new tag...'
            style={{
              border: 'none', 
            }}
            list={id}
            autoComplete='on'
            onChange={(e) => this.props.tagInputTextChanged({value: e.target.value, noteId:this.props.id})}
            value={this.props.tagInput}
            onKeyDown={this.handleKeyDown}
          />
          {this.props.tags.map(tag => 
          <div 
            key={tag} 
            className={'tag'}>
            <IconButton
              iconClassName="muidocs-icon-custom-clear"
              className={this.props.selected && this.props.editing ? 
                'remove-tag-button' : 'hidden'}
              onTouchTap={() => this.props.tagRemoved({tag})}
            />
            {tag}
          </div>)}
        </div>
      )
    }
  }
) 
