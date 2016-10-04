import React from 'react';
import { connect } from 'cerebral-view-react';
import uuid from 'uuid';
import styles from './menu-bar.css';

export default connect({
  notifications: 'app.view.notifications',
}, {

},

class MenuBar extends React.Component {

  static propTypes = {

  };

  render() {
    const signals = this.props.signals.home;
    var notifications = this.props.geohashesToDraw;

/*
        <FontAwesome
          name='ellipsis-v'
          size='2x'
          className='overflow-menu'
          onClick={() => signals.addFieldButtonClicked()}
        />
        <FontAwesome
          name=''
          size='2x'
          className='export-notes'
          onClick={() => signals.exportNotesButtonClicked()}
        />

*/

    return (
      <div id='menu-bar'>
        <FontAwesome
          name={(notifications.length > 0) ? 'bell' : 'bell-o'}
          size='2x'
          className='notifications'
          onClick={() => signals.notificationsButtonClicked()}
        />
      </div>
    );
  }
})
