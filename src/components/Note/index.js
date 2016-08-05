import React, { PropTypes } from 'react';
import {connect} from 'cerebral-view-react'
import TextAreaAutoSize from 'react-textarea-autosize';
import EditTagsBar from './editTagsBar.js';
import uuid from 'uuid';
import styles from './note.css';
import fastyles from '../css/font-awesome.min.css';
import Color from 'color'; 
import FontAwesome from 'react-fontawesome';

export default connect(props => ({
  note: `app.model.notes.${props.id}`,
  text: `app.model.notes.${props.id}.text`,
  tags: `app.model.notes.${props.id}.tags`,
  selected: `app.model.notes.${props.id}.selected`,
  geometryVisible: `app.model.notes.${props.id}.geometry_visible`,
  drawMode: 'app.view.draw_mode',
}), {
  deleteNoteButtonClicked: 'app.deleteNoteButtonClicked',
  doneDrawingButtonClicked: 'app.doneDrawingButtonClicked',
  noteClicked: 'app.noteClicked',
  noteTextChanged: 'app.noteTextChanged',
},

  class Note extends React.Component {

    constructor(props) {
      super(props)
    }
   
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
  /*
          <button 
            type="button" 
            className={styles['note-show-hide-button']} 
            onClick={() => this.props.showHideButtonClicked({id: this.props.id})}
            >{this.props.geometryVisible ? 'Hide' : 'Show'}
          </button>
  */ 
      var doneDrawingButton = (this.props.selected && this.props.drawMode) ? 
        <FontAwesome 
          tabIndex={2}
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
          onClick={() => this.props.doneDrawingButtonClicked({drawMode:false, ids:[this.props.id]})}
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
          onClick={() => this.props.deleteNoteButtonClicked({id:this.props.id})}
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
  /*
  
  */
      return (
        <div 
          key={uuid.v4()}
          style={{backgroundColor:this.props.note.color, borderColor:this.props.note.color}} 
          color={textColor}
          className={styles[this.props.selected ? 'selected-note' : 'note']} 
          onClick={() => this.props.noteClicked({note:this.props.id})}
        >
          <input
            key={uuid.v4()} 
            tabIndex={1}
            style={{backgroundColor:this.props.note.color}} 
            value={this.props.text} 
            placeholder='Type note description here'
            minRows={1} 
            className={styles['note-text-input']} 
            onChange={(e) => this.props.noteTextChanged({value: e.target.value, noteId:this.props.id})}
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
)
