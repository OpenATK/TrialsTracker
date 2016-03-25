import React, { PropTypes } from 'react';
import { Decorator as Cerebral, Link } from 'cerebral-view-react';
import uuid from 'uuid';
import styles from './menu-bar.css';


@Cerebral((props) => {
  return {
    
  };
})     

class MenuBar extends React.Component {

  static propTypes = {

  };

  render() {
    const signals = this.props.signals.home;

    return (
      <div id='menu-bar'>
        <button type="button" className={styles['menu-button']} onClick={() => signals.addFieldButtonClicked()}>New Field</button>
        <button type="button" className={styles['menu-button']} onClick={() => signals.overflowMenuButtonClicked()}>Overflow Menu</button>
        <button type="button" className={styles['menu-button']} onClick={() => signals.importYieldDataButtonClicked}>Import Yield Data</button>
      </div>
    );
  }
}

export default MenuBar;
