const redis = require('redis')
const redisServer = require('./redis-server')

const assertClientConnection = (port) => {
  const client = redis.createClient(port)

  return new Promise((res, rej) => {
    client.on('error', (error) => {
      return rej(error)
    })
    client.on('ready', () => {
      return res()
    })
  })
    .finally(() => client.quit())
}

describe.only('redisServer', () => {
  it('should start a server on default port', () => {
    const port = 6379
    return redisServer.start(port)
      .then(() => assertClientConnection(port))
  })

  it('should start a server on a random port', () => {
    const port = 9999
    return redisServer.start(port)
      .then(() => assertClientConnection(port))
  })

  it('should fail when a server is already running on port', () => {
    const port = 6379
    return redisServer.start(port)
      .then(() => new Promise((res, rej) => {
        return redisServer.start(port)
          .then(() => rej(new Error('Server ran twice.')))
          .catch(res)
      }))
  })

  it('should start two servers on different ports', () => {
    return redisServer.start(9998)
      .then(() => redisServer.start(9999))
      .then(() => assertClientConnection(9998))
      .then(() => assertClientConnection(9999))
  })

  afterEach(() => redisServer.flush())
})
