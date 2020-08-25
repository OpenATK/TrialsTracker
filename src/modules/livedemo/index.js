import { Module } from 'cerebral'
import * as signals from './sequences'

export default Module({

	signals,

  state : {
    running: false,
    text: '',
    index: 0,
    speed: 1,
    paused: false,
    speedText: ['0.25X', '1X', '2X', '4X'],
  }
})
