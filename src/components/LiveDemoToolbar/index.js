import {connect} from '@cerebral/react';
import React from 'react';
import { state, signal } from 'cerebral/tags';
import { ToolbarGroup, ToolbarTitle, Toolbar, IconButton } from 'material-ui';


export default connect({
  text: state`livedemo.text`,
  index: state`livedemo.index`,
  speed: state`livedemo.speed`,
  speedText: state`livedemo.speedText`,
  paused: state`livedemo.paused`,

  stop: signal`yield.stopLiveData`,
  play: signal`yield.playLiveData`,
  pause: signal`yield.pauseLiveData`,
  fastForward: signal`yield.fastForwardLiveData`,
  rewind: signal`yield.rewindLiveData`,
},

class LiveDemo extends React.Component {

  render() {
    return (
      <Toolbar>
        <ToolbarTitle text={this.props.text}/>
        <ToolbarGroup firstChild={true}>
          {(false) ? null : <IconButton
            key={0}
            disabled={true}
            onClick={() => this.props.rewind({})}
            iconClassName="material-icons">fast_rewind
          </IconButton>}
          <IconButton
            disabled={this.props.index === 0}
            key={1}
            onClick={() => this.props.stop({})}
            iconClassName="material-icons">stop
          </IconButton>
          {this.props.paused ? null : <IconButton
            key={2}
            onClick={() => this.props.pause({})}
            iconClassName="material-icons">pause
          </IconButton>}
          {this.props.paused ?  <IconButton
            key={2}
            onClick={() => this.props.play({})}
            iconClassName="material-icons">play_arrow
          </IconButton> : null}
          <IconButton
            key={3}
            onClick={() => this.props.fastForward({})}
            iconClassName="material-icons">fast_forward
          </IconButton>
          <span>{this.props.speedText[this.props.speed]}</span>
        </ToolbarGroup>
      </Toolbar>
    )
  }
})
