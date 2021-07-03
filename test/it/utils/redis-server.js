const spawn = require('cross-spawn')
const fs = require('fs')
const tcp = require('tcp-port-used')
const Promise = require('bluebird')
const { keys, map } = require('ramda')

const DEFAULT_PORT = 6379

const getSocketPathForPort = (port) => {
  return port === DEFAULT_PORT
    ? '/tmp/redis.sock'
    : `/tmp/redis${port}.sock`
}

const createArgs = (port) => {
  return [
    '--port', port,
    '--bind', '::1', '127.0.0.1',
    '--unixsocket', getSocketPathForPort(port),
    '--unixsocketperm', '700',
    '--save', '""'
  ] 
}

const fileExists = (path) => new Promise((res) => {
  fs.access(path, fs.constants.F_OK, (err) => {
    res(!err)
  })
})

const isServerRunning = (port) => Promise.join(
  tcp.check(port, '127.0.0.1'),
  tcp.check(port, '::1'),
  fileExists(getSocketPathForPort(port)),
  (ipv4, ipv6, socket) => {
    if (ipv4 && ipv6) {
      if (socket) return true
      return Promise.reject(new Error(`A server is already running on port ${port}`))
    }
    return false
  })

const waitForServerStatus = (port, status) => new Promise((res, rej) => {
  const timestamp = Date.now()

  const id = setInterval(async () => {
    try {
      const isRunning = await isServerRunning(port)

      if (isRunning === status) {
        clearInterval(id)
        res()
      }

      if (Date.now() - timestamp > 6000) {
        clearInterval(id)
        rej(new Error(`Server unable to ${status ? 'start' : 'stop'} on port ${port}`))
      }
    } catch (e) {
      rej(e)
    }
  }, 100)
})

let servers = {}

const start = (port) => new Promise((res, rej) => {
  if (servers[port]) {
    return rej(new Error(`A server is already running on port ${port}`))
  }

  const process = spawn('redis-server', createArgs(port), {})
  servers[port] = process

  process.once('exit', function (code) {
    if (code !== 0) {
      return rej(new Error('Error creating redis server'))
    }
  })

  waitForServerStatus(port, true)
    .then(res)
    .catch(rej)
})

const stop = (port) => new Promise((res, rej) => {
  const process = servers[port]
  if (!process) {
    return rej(new Error(`No server running on port ${port}`))
  }

  process.once('exit', (code) => {
    if (code !== null && code !== 0) {
      return rej(new Error(`Server shutdown failed with code ${code}`))
    }

    waitForServerStatus(port, false)
      .then(() => {
        delete servers[port]
        res()
      })
      .catch(rej)
  })

  process.kill('SIGTERM')
})

const flush = () => {
  return Promise.map(
    map(Number, keys(servers)),
    stop
  )
}

module.exports = { servers, start, stop, flush }
