import React, { PropTypes } from 'react';
import { Decorator as Cerebral, Link } from 'cerebral-view-react';
import TextAreaAutoSize from 'react-textarea-autosize';
import EditTagsBar from './editTagsBar.js';
import uuid from 'uuid';
import styles from './note.css';
import fastyles from './font-awesome.min.css';
import Color from 'color'; 
import FontAwesome from 'react-fontawesome';

@Cerebral((props) => {
  return {
    selectedNote: ['home', 'model', 'selected_note'],
    note: ['home', 'model', 'notes', props.id],
    text: ['home', 'model', 'notes', props.id, 'text'],
    tags: ['home', 'model', 'notes', props.id, 'tags'],
    selected: ['home', 'model', 'notes', props.id, 'selected'],
    drawMode: ['home', 'view', 'drawMode'],
    geometryVisible: ['home', 'model', 'notes', props.id, 'geometry_visible'],
    areaw: ['home', 'model', 'notes', props.id, 'area'],
  };
})

class Note extends React.Component {
 
  static propTypes = {
    text: PropTypes.string,
    showHide: PropTypes.string,
  };

  generateTextColor(color) {
    var hsvColor = Color(color).hsv();
    hsvColor.v *= 0.8;
    hsvColor = Color(hsvColor);
    return Color(hsvColor).hexString();
  };

  render() {
    var tags = [];
    var self = this;
    _.each(this.props.tags, function(tag) {
//      if (self.state.editTags && self.state.note.id === self.state.selectedNote) {
//        tags.push(React.createElement("div", {key:uuid.v4(), className: "tag"}, React.createElement("button", {key:uuid.v4(), onClick:self.removeTag.bind(null, tag)}, "X"), tag));
//      } else {
        tags.push(<span className={styles.tag} key={uuid.v4()}>{tag}</span>);
//      }
    });
    const signals = this.props.signals.home;
/*
        <button 
          type="button" 
          className={styles['note-show-hide-button']} 
          onClick={() => signals.showHideButtonClicked({id: this.props.id})}
          >{this.props.geometryVisible ? 'Hide' : 'Show'}
        </button>
*/ 
    var doneDrawingButton = (this.props.selected && this.props.drawMode) ? 
      <FontAwesome 
        className='done-drawing-button'
        name='check'
        size='2x'
        style={{
          color:'#00FF00',
          position: 'absolute',
          bottom: 0,
          right: 0,
          margin: '2px',
        }}
        onClick={() => signals.doneDrawingButtonClicked({drawMode:false, ids:[this.props.id]})}
      /> : null;

    var showHideButton = (this.props.showHide) ? 
      <FontAwesome 
        className='show-hide-button'
        name='check'
      /> : null;

    var deleteNoteButton = (this.props.selected) ? 
      <FontAwesome 
        name='times'
        size='2x'
        className='delete-note-button'
        style={{
          color:'#FF0000',
          position: 'absolute',
          top: 0,
          right: 0,
          margin: '2px',
        }}
        onClick={() => signals.deleteNoteButtonClicked({id:this.props.id})}
      /> : null;

    var yieldString = this.props.note.mean ? 'Yield: ' + this.props.note.mean.toFixed(2) + ' bu/ac' : null;
    var areaString = this.props.note.area ? 'Area: ' + this.props.note.area.toFixed(2) + ' acres' : null;
    var textColor = this.generateTextColor(this.props.note.color);
    return (
      <div 
        key={uuid.v4()}
        style={{backgroundColor:this.props.note.color, borderColor:this.props.note.color}} 
        color={textColor}
        className={styles[this.props.selected ? 'selected-note' : 'note']} 
        onClick={() => signals.noteClicked({note:this.props.id})}
      >

      {deleteNoteButton}
      {doneDrawingButton}

        <TextAreaAutoSize 
          key={uuid.v4()} 
          style={{backgroundColor:this.props.note.color}} 
          value={this.props.text} 
          minRows={1} 
          color={textColor}
          className={styles['note-text-input']} 
          onChange={(e) => signals.noteTextChanged.sync({value: e.target.value, noteId:this.props.id})}
        ></TextAreaAutoSize>
  
        <hr/>
        {areaString}
        <br/>
        {yieldString}
        <button type="button" className={styles[this.props.selected ? 'note-edit-tags-button' : 'hidden']} >Edit Tags</button>
        <EditTagsBar id={this.props.id} color={this.props.note.color}/>
      </div>
    );
  }
}
export default Note;
