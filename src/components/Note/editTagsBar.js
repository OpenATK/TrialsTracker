import React, { PropTypes } from 'react';
import { connect } from 'cerebral-view-react';
import uuid from 'uuid';
import styles from './editTagsBar.css'
import fastyles from '../css/font-awesome.min.css';
import FontAwesome from 'react-fontawesome';

export default connect(props => ({
  note: `app.model.notes.${props.id}`,
  tags: `app.model.notes.${props.id}.tags`,
  allTags: 'app.model.tags',
  editing: 'app.view.editing_note',
  selected: `app.model.notes.${props.id}.selected`,
  tagInput: 'app.model.tag_input_text',
}), {
  tagAdded: 'app.tagAdded',
  tagRemoved: 'app.tagRemoved',
  tagInputTextChanged: 'app.tagInputTextChanged',
},

  class EditTagsBar extends React.Component {

    componentWillMount() {
      this.handleKeyDown = this.handleKeyDown.bind(this);
    }
  
    handleKeyDown(evt) {
      if (evt.keyCode == 13 || evt.keyCode == 9) {
        this.props.tagAdded({text: evt.target.value});
      }
    }
  
    render() {
      var tags = [];
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
          className={styles[((this.props.editing && this.props.selected) || this.props.tags.length > 0) ? 
            'edit-tags-bar' : 'hidden']}>
          <datalist id={id}>
            {options}
          </datalist>
          <input 
            className={styles[this.props.editing && this.props.selected ? 
              (this.props.note.font_color == '#ffffff' ? 'input-white' : 'input-black')
              : 'hidden'
            ]}
            placeholder='Add a new tag...'
            style={{
              backgroundColor: this.props.note.color, 
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
            className={styles["tag"]}>
            <FontAwesome 
              name='times'
              className={styles[this.props.selected && this.props.editing ? 
                'remove-tag-button' : 'hidden']}
              onClick={() => this.props.tagRemoved({tag})}
            />
            {tag}
          </div>)}
        </div>
      )
    }
  }
) 
