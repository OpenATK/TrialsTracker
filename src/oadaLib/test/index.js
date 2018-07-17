var oadaLib = require('../index')
let gh = require('ngeohash');

let someGet = {
  method: 'get',
  headers: {
    'Authorization': 'Bearer def'
  },
}


it('should perform a get over http', () => {
	expect(oadaLib.get({})).toBe();
})

it('should perform a put over http', ()=> {
  expect(oadaLib.put({ })).toBe();
})

