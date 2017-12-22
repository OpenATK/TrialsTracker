import Promise from 'bluebird';

export default function configureWebsocketProvider ({oada, state, props, path}) {
  return Promise.resolve().then(() => {
		if (oada == null) throw new Error('Websocket provider is undefined. Please add it to your controller.')
		return oada.configure(props.domain).then((socket) => {
			return path.success()
		}).catch((error) => {
      return path.error({error})
		})
  })
}
