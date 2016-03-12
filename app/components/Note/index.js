import React, { PropTypes } from 'react';
import { Decorator as Cerebral, Link } from 'cerebral-view-react';
import TextAreaAutoSize from 'react-textarea-autosize';
//import TagsInput from '../TagsInput/';
import uuid from 'uuid';
import styles from './note.css'

@Cerebral((props) => {
  return {
    selectedNote: ['home', 'model', 'selected_note'],
    note: ['home', 'model', 'notes', props.id],
    text: ['home', 'model', 'notes', props.id, 'text'],
    tags: ['home', 'model', 'notes', props.id, 'tags'],
    selected: ['home', 'model', 'notes', props.id, 'selected'],
    showHide: ['home', 'model', 'notes', props.id, 'geojson_visible'],
  };
})

class Note extends React.Component {
 
  static propTypes = {
    text: PropTypes.string,
    showHide: PropTypes.string,
  };

  render() {
    var tags = [];
    var self = this;
    _.each(this.props.tags, function(tag) {
//      if (self.state.editTags && self.state.note.id === self.state.selectedNote) {
//        tags.push(React.createElement("div", {key:uuid.v4(), className: "tag"}, React.createElement("button", {key:uuid.v4(), onClick:self.removeTag.bind(null, tag)}, "X"), tag));
//      } else {
        tags.push(<span className={styles.tag} key={uuid.v4()}>{tag.text}</span>);
//      }
    });
    const signals = this.props.signals.home;

    //console.log(this.props.showHide);
    //console.log(this.props.showHide);

    //1. showHide button function into chains.js

    return (
      <div style={{backgroundColor:this.props.note.color, borderColor:this.props.note.color}} className={styles[this.props.selected ? 'selected-note' : 'note']} onClick={() => signals.noteSelected({newSelectedNote:this.props.id})}>
        <TextAreaAutoSize style={{backgroundColor:this.props.note.color}} value={this.props.text} minRows={1} className={styles['note-text-input']} onChange={(e) => signals.noteTextChanged.sync({value: e.target.value, noteId:this.props.id})}></TextAreaAutoSize>
        <button type="button" className={styles['note-show-hide-button']} onClick={() => signals.showHide({id: this.props.id})}>{this.props.showHide}</button>
        <button type="button" className={styles[this.props.selected ? 'note-remove-button' : 'hidden']} onClick={() => signals.deleteNoteButtonClicked({id:this.props.id})}>Delete Note</button>
        <button type="button" className={styles[this.props.selected ? 'note-edit-tags-button' : 'hidden']} >Edit Tags</button>
        {tags}
      </div>
    );
  }
}

export default Note;
