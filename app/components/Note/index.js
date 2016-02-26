import React, { PropTypes } from 'react';
import { Decorator as Cerebral, Link } from 'cerebral-view-react';
import TextAreaAutoSize from 'react-textarea-autosize';
//import TagsInput from '../TagsInput/';
import uuid from 'uuid';
import styles from './note.css'

@Cerebral((props) => {
  return {
    selectedNote: ['home', 'model', 'selected_note'],
    notes: ['home', 'model', 'notes'],
    note: ['home', 'model', 'notes', props.id],
    text: ['home', 'model', 'notes', props.id, 'text'],
    tags: ['home', 'model', 'notes', props.id, 'tags'],
    selected: ['home', 'model', 'notes', props.id, 'selected'],
    showHide: ['home', 'model', 'notes', props.id, 'geojson_visible'],
    className: ['home', 'model', 'notes', props.id, 'class_name'],
  };
})

class Note extends React.Component {
 
  static propTypes = {
    text: PropTypes.string,
    tags: PropTypes.arrayOf(PropTypes.string),
    showHide: PropTypes.string,
  };

  render() {
    var tags = [];
    _.each(this.props.tags, function(tag) {
      tags.push(<span className={styles.tag} key={uuid.v4()}>{tag.text}</span>);
    });
    console.log(this.props.selecteNote);
    const signals = this.props.signals.home;

    return (
      <div style={{borderColor:this.props.note.color}} className={this.props.className} onClick={() => signals.noteSelected({currentSelectedNote: this.props.selectedNote, newSelectedNote:this.props.id})}>
        <TextAreaAutoSize value={this.props.text} minRows={3} className='note-text-input' onChange={(e) => signals.noteTextChanged.sync({value: e.target.value})}></TextAreaAutoSize>
        <button type="button" className="note-remove-button" onClick={() => signals.noteRemoved(['home', 'model', 'notes', this.props.id])}>Delete Note</button>
        <button type="button" className="note-edit-tags-button">Edit Tags</button>
        <button type="button" className="note-show-hide-button" onClick={() => signals.showHide({cursor: ['home', 'model', 'notes', this.props.id, 'showHide']})}>{this.props.showHide}</button>
        {tags}
      </div>
    );
  }
}

export default Note;
