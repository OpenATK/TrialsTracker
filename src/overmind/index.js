import { createHook } from "overmind-react"

import { namespaced } from 'overmind/config'

import * as view from './view'
import * as app from './app'

export const config = namespaced({
  view,
  app,
})

export default createHook()
