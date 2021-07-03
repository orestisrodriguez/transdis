const redis = require('redis')
const Promise = require('bluebird')
const { merge } = require('ramda')

const overrideOpts = { return_buffers: true }

const getRedisClient = (opts) => {
  const client = opts instanceof redis.RedisClient
    ? opts
    : redis.createClient(merge(opts, overrideOpts))

  return Promise.promisifyAll(client)
}

const getDataFromKeys = async (client, keys) => {
  const data = new Map()

  for (const buffer of keys) {
    const key = buffer.toString()
    const value = await client.dumpAsync(key)
    const ttl = await client.pttlAsync(key)
    const item = {
      raw: value,
      ttl: ttl < 0 ? 0 : ttl,
    }

    data.set(key, item)
  }

  return data
}

const read = async (client, position, previous = []) => {
  const [ cursor, keys ] = await client.scanAsync(position, 'COUNT', 500)
  const data = await getDataFromKeys(client, keys)
  const dump = new Map([ ...previous, ...data ])

  const nextPosition = Number(cursor.toString())
  if (nextPosition === 0) return dump

  return await read(client, nextPosition, dump)
}

const save = (client, dump) =>
  Promise.map(dump, ([ key, item ]) => {
    const { raw, ttl } = item
    return client.restoreAsync(key, ttl, raw)
  })

async function migrate (source, destination) {
  const clients = {
    src: getRedisClient(source),
    dst: getRedisClient(destination),
  }

  if (clients.src.options.return_buffers !== true) {
    throw new Error('Source client should have return_buffers option set to true.')
  }

  const dump = await read(clients.src, 0)
  return save(clients.dst, dump)
}

module.exports = migrate
