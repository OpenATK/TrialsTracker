import React, { PropTypes } from 'react';
import { Decorator as Cerebral, Link } from 'cerebral-view-react';
import TextAreaAutoSize from 'react-textarea-autosize';
import EditTagsBar from './editTagsBar.js';
import uuid from 'uuid';
import styles from './note.css';
import fastyles from '../css/font-awesome.min.css';
import Color from 'color'; 
import FontAwesome from 'react-fontawesome';

@Cerebral((props) => {
  return {
    selectedNote: ['home', 'model', 'selected_note'],
    note: ['home', 'model', 'notes', props.id],
    text: ['home', 'model', 'notes', props.id, 'text'],
    tags: ['home', 'model', 'notes', props.id, 'tags'],
    selected: ['home', 'model', 'notes', props.id, 'selected'],
    drawMode: ['home', 'view', 'draw_mode'],
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
          float: 'right',
        }}
        onClick={() => signals.deleteNoteButtonClicked({id:this.props.id})}
      /> : 
      <FontAwesome 
        name='times'
        size='2x'
        className='delete-note-button'
        style={{
          color:'transparent',
          float: 'right',
        }}
      />;

    var yieldString = this.props.note.mean ? 'Yield: ' + this.props.note.mean.toFixed(2) + ' bu/ac' : null;
    var areaString = this.props.note.area ? 'Area: ' + this.props.note.area.toFixed(2) + ' acres' : null;
    var noteInfo = 
      <div
        key={uuid.v4()}
        className={styles['note-info']}>
        {areaString}
        <br/>
        {yieldString}
      </div>;
    var textColor = this.generateTextColor(this.props.note.color);
    console.log(this.props.text);
/*
        <TextAreaAutoSize 
          key={uuid.v4()} 
          style={{backgroundColor:this.props.note.color}} 
          value={this.props.text} 
          placeholder='Type note description here'
          minRows={1} 
          className={styles['note-text-input']} 
          onChange={(e) => signals.noteTextChanged({value: e.target.value, noteId:this.props.id}, {immediate: true})}
//          autoFocus={this.props.selected ? 'autofocus' : null}
        ></TextAreaAutoSize>
*/
    return (
      <div 
        key={uuid.v4()}
        style={{backgroundColor:this.props.note.color, borderColor:this.props.note.color}} 
        color={textColor}
        className={styles[this.props.selected ? 'selected-note' : 'note']} 
        onClick={() => signals.noteClicked({note:this.props.id})}
      >
        <input
          className={styles['note-text-input']} 
          placeholder='Type note description here'
          key={uuid.v4()}
          value={this.props.text}
          style={{backgroundColor:this.props.note.color}} 
          onChange={(e) => signals.noteTextChanged({value: e.target.value, noteId:this.props.id}, {immediate: true})}
        />
        {deleteNoteButton}
        <hr noshade/>
        {noteInfo}
        {doneDrawingButton}
        <EditTagsBar 
          id={this.props.id} 
          color={this.props.note.color}
          selected={this.props.selected}
        />
      </div>
    );
  }
}
export default Note;
