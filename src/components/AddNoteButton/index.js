import React, { PropTypes } from 'react';
import {connect} from 'cerebral-view-react'
import TextAreaAutoSize from 'react-textarea-autosize';
import styles from './add-note-button.css';
import rmc from 'random-material-color';
import Color from 'color';

export default connect(props => ({
}), {
  addNoteButtonClicked: 'app.addNoteButtonClicked',
},

class AddNoteButton extends React.Component {

  render() {
    var baseColor = rmc.getColor();
    var fontColor = this.getFontColor(baseColor);
    fontColor = Color(fontColor);
    fontColor.values.alpha = 0.2;
    fontColor = fontColor.rgb();
    fontColor = 'rgba('+fontColor.r+','+fontColor.g+','+fontColor.b+','+fontColor.a+')';

    var col = Color(baseColor);
    col.values.alpha = 0.2;
    col = col.rgb();
    var textInputColor = 'rgba('+col.r+','+col.g+','+col.b+',0)';
    col = 'rgba('+col.r+','+col.g+','+col.b+','+col.a+')';

    return (
      <div 
        className={styles['add-note-button']} 
        style={{color: fontColor, backgroundColor:col}} 
        onClick={(e) => this.props.addNoteButtonClicked({drawMode: true, color: baseColor, fontColor})}>
        <div
          className={styles['add-note-modal']}>
          Add Note
        </div>
        <TextAreaAutoSize
          style={{backgroundColor: textInputColor}} 
          className={styles['note-text-input']} 
          value={''} 
          minRows={1} 
          tabIndex={1}
          placeholder='Type note description here'
          readOnly={this.props.editing ? false : "readonly"}
        />
        <hr
          style={{backgroundColor:fontColor, color: fontColor}} 
          noshade
        />
        <div
          className={styles['note-info']}>
          Area:
          <br/>
          Yield:
        </div>
      </div>
    );
  }
})
