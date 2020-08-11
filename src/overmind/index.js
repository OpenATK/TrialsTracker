import { createHook } from "overmind-react"

import { namespaced } from 'overmind/config'

import * as view from './view'
import * as notes from './notes'
import * as yieldmod from './yield'
import * as app from './app'

export const config = namespaced({
  view,
  notes,
  yield: yieldmod,
  app,
})

export default createHook()
