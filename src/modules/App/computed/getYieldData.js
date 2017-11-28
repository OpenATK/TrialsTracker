import {Computed} from 'cerebral'

export default Computed({
  domain: 'App.settings.data_sources.yield.oada.domain',
  domain: 'App.settings.data_sources.yield.oada.token',
}, props => {
  return props.users.filter(user => {
    if (props.filter === 'all') {
      return true
    }
    if (props.filter === 'awesome') {
      return user.isAwesome
    }
    if (props.filter === 'notAwesome') {
      return !user.isAwesome
    }
  })
})
