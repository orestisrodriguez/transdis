const redis = require('redis')
const Promise = require('bluebird')
const { expect } = require('chai')

const redisServer = require('./utils/redis-server')
const migrate = require('../../lib/migrate')

describe('migrate', () => {
  let clients = {}

  before(async () => {
    await redisServer.start(9998)
    await redisServer.start(9999)

    const sourceClient = redis.createClient({ port: 9998, return_buffers: true })
    const destinationClient = redis.createClient(9999)

    clients.source = Promise.promisifyAll(sourceClient)
    clients.destination = Promise.promisifyAll(destinationClient)
  })

  beforeEach(async () => {
    await clients.source.flushallAsync()
    await clients.destination.flushallAsync()
  })

  describe('should handle keys', () => {

    it('of type string', async () => {
      const key = 'key1'
      const value = '1'
      await clients.source.setAsync(key, value)
      await migrate(clients.source, clients.destination, {})

      const migratedValue = await clients.destination.getAsync(key)
      expect(migratedValue).to.equal(value)
    })

    it('of type list', async () => {
      const key = 'key2'
      const values = [ 'a', 'b', 'c' ]
      await clients.source.rpushAsync(key, values)
      await migrate(clients.source, clients.destination, {})

      const migratedLength = await clients.destination.llenAsync(key)
      expect(migratedLength).to.equal(values.length)
      const migratedValues = await clients.destination.lrangeAsync(key, 0, migratedLength - 1)
      expect(migratedValues).to.deep.equal(values)
    })

    it('with ttl', async () => {
      const key = 'key1'
      const value = '1'
      const ttl = 60
      const delay = 1
      await clients.source.setAsync(key, value, 'EX', ttl)
      await Promise.delay(delay * 1000)
      await migrate(clients.source, clients.destination, {})

      const migratedValue = await clients.destination.getAsync(key)
      const migratedTTL = await clients.destination.ttlAsync(key)
      expect(migratedValue).to.equal(value)
      expect(migratedTTL).to.equal(ttl - delay)
    })

  })

  it('should replace destination database', async () => {
    const key = 'key1'
    const value = '1'
    await clients.source.setAsync(key, value)
    await clients.destination.setAsync('foo', 'bar')
    await migrate(clients.source, clients.destination, { replace: true })

    const keys = await clients.destination.keysAsync('*')
    expect(keys).to.deep.equal([ 'key1' ])
  })

  it('should handle lots of keys', async () => {
    const length = 500
    for (let i = 1; i <= length; i++) {
      await clients.source.setAsync(`key${i}`, `value${i}`)
    }
    await migrate(clients.source, clients.destination, {})

    const keys = await clients.destination.keysAsync('*')
    expect(keys).to.have.lengthOf(length)
  })

  after(() => {
    clients.source.quit()
    clients.destination.quit()

    return redisServer.flush()
  })
})
