import { EventEmitter } from 'events'
import express from 'express'
import http from 'http'
import path from 'path'
import { promisify } from 'util'
import fs from 'fs'
import sockjs from 'sockjs'
import MemoryFileSystem from 'memory-fs'
import hasha from 'hasha'
import open from 'opn'

import { staticPath } from './config'
import Skeleton from './skeleton'
import {createLog, sockWrite, addDprAndFontSize, generateQR, getLocalIpAddress} from './util'

const myFs = new MemoryFileSystem()
export default class Server extends EventEmitter {
    sockets
    skeleton
    log
    app
    listenServer
    port
    staticPath
    sockjsServer
    routesData: {}
    origin: any
  previewPageUrl: string
  host: any
    constructor(options = {}) {
        super()
        Object.keys(options).forEach(k => Object.assign(this, { [k]: options[k] }))
        this.sockets = []
        this.log = createLog({})
        this.staticPath = staticPath
        this.skeleton = new Skeleton(options, this.log)
        this.host = getLocalIpAddress()
        this.previewPageUrl = `http://${this.host}:${options.port}/preview.html`
    }
    // 启动服务
    async listen() {
        /* eslint-disable no-multi-assign */
        const app = this.app = express()
        const listenServer = this.listenServer = http.createServer(app)
        /* eslint-enable no-multi-assign */
        this.initRouters()
        this.initSocket()
        listenServer.listen(this.port, () => {
        this.log.info(`page-skeleton server listen at port: ${this.port}`)
        })
    }
    // 注册响应
    async initRouters() {
        const { app, staticPath, log } = this
        app.use('/', express.static(path.resolve(__dirname, '../preview/dist')))
    
        const staticFiles = await promisify(fs.readdir)(path.resolve(__dirname, '../client'))
    
        staticFiles
          .filter(file => /\.bundle/.test(file))
          .forEach((file) => {
            app.get(`/${staticPath}/${file}`, (req, res) => {
              res.setHeader('Content-Type', 'application/javascript')
              fs.createReadStream(path.join(__dirname, '..', 'client', file)).pipe(res)
            })
          })
    
        app.get('/preview.html', async (req, res) => {
          fs.createReadStream(path.resolve(__dirname, '..', 'preview/dist/index.html')).pipe(res)
        })
    
        app.get('/:filename', async (req, res) => {
          const { filename } = req.params
          if (!/\.html$/.test(filename)) return false
          let html = await promisify(fs.readFile)(path.resolve(__dirname, 'templates/notFound.html'), 'utf-8')
          try {
            // if I use `promisify(myFs.readFile)` if will occur an error
            // `TypeError: this[(fn + "Sync")] is not a function`,
            // So `readFile` need to hard bind `myFs`, maybe it's an issue of `memory-fs`
            html = await promisify(myFs.readFile.bind(myFs))(path.resolve(__dirname, `${staticPath}/${filename}`), 'utf-8')
          } catch (err) {
            log.warn(`When you request the preview html, ${err} ${filename}`)
          }
          res.send(html)
        })
      }
      initSocket() {
        const { listenServer, log } = this
        const sockjsServer = sockjs.createServer({
          sockjs_url: `/${this.staticPath}/sockjs.bundle.js`,
          log(severity, line) {
            if (severity === 'error') {
              log.warn(line)
            }
          }
        })
        this.sockjsServer = sockjsServer
        sockjsServer.installHandlers(listenServer, { prefix: '/socket' })
        sockjsServer.on('connection', (conn) => {
          if (this.sockets.indexOf(conn) === -1) {
            this.sockets.push(conn)
            // log.info(`client socket: ${conn.id.split('-')[0]}... connect to server`)
          }
    
          conn.on('data', this.resiveSocketData(conn))
    
          conn.on('close', () => {
            const index = this.sockets.indexOf(conn)
            if (index > -1) this.sockets.splice(index, 1)
            if (this.previewSocket === conn) {
              this.previewSocket = null
              log.info('preview closed')
            }
          })
        })
      }
      /**
   * 处理 data socket 消息
   */
  resiveSocketData(conn) {
    const { log } = this
    return async (data) => {
      const msg = JSON.parse(data)
      switch (msg.type) {
        case 'generate': {
          if (!msg.data) return log.info(msg)
          this.origin = msg.data
          const origin = msg.data
          const preGenMsg = 'begin to generator skeleton screen'
          log.info(preGenMsg)
          sockWrite(this.sockets, 'console', preGenMsg)
          try {
            const skeletonScreens = await this.skeleton.renderRoutes(origin)
            // CACHE html
            this.routesData = {}
            /* eslint-disable no-await-in-loop */
            for (const { route, html } of skeletonScreens) {
              const fileName = await this.writeMagicHtml(html)
              const skeletonPageUrl = `http://${this.host}:${this.port}/${fileName}`
              this.routesData[route] = {
                url: origin + route,
                skeletonPageUrl,
                qrCode: await generateQR(skeletonPageUrl),
                html
              }
            }
            /* eslint-ensable no-await-in-loop */
            const afterGenMsg = 'generator skeleton screen successfully'
            log.info(afterGenMsg)
            sockWrite(this.sockets, 'console', afterGenMsg)

            if (this.previewSocket) {
              sockWrite([this.previewSocket], 'url', JSON.stringify(this.routesData))
            } else {
              const openMsg = 'Browser open another page...'
              sockWrite([conn], 'console', openMsg)
              sockWrite([conn], 'success', openMsg)
              // open Chrome browser incognito
              let appName = 'google chrome'
              if (process.platform === 'win32') {
                appName = 'chrome'
              } else if (process.platform === 'linux') {
                appName = 'google-chrome'
              }
              console.log(this.previewPageUrl)
              open(this.previewPageUrl, { app: [appName, '--incognito'] })
            }
          } catch (err) {
            const message = err.message || 'generate skeleton screen failed.'
            log.warn(err)
            sockWrite(this.sockets, 'error', message)
          }
          break
        }

        case 'connect': {
          if (msg.data === 'preview') {
            this.previewSocket = conn
            log.info('preview page connected')
          }
          break
        }

        case 'url': {
          if (msg.data !== 'preview') return log.info(msg)
          sockWrite([conn], 'url', JSON.stringify(this.routesData))
          break
        }

        case 'writeShellFile': {
          sockWrite([conn], 'console', 'before write shell files...')
          const { routesData, options } = this
          try {
            await writeShell(routesData, options)
          } catch (err) {
            log.warn(err)
          }
          const afterWriteMsg = 'Write files successfully...'
          log.info(afterWriteMsg)
          sockWrite([conn], 'console', afterWriteMsg)
          break
        }

        case 'saveShellFile': {
          const { route, html } = msg.data
          if (html) {
            this.routesData[route].html = html
            const fileName = await this.writeMagicHtml(html)
            this.routesData[route].skeletonPageUrl = `http://${this.host}:${this.port}/${fileName}`
            sockWrite([this.previewSocket], 'update', JSON.stringify(this.routesData))
          }
          break
        }
        default: break
      }
    }
  }
  /**
   * 将 sleleton 模块生成的 html 写入到内存中。
   */
   async writeMagicHtml(html) {
    const decHtml = addDprAndFontSize(html)
    try {
      const { staticPath } = this
      const pathName = path.join(__dirname, staticPath)
      let fileName = await hasha(decHtml, { algorithm: 'md5' })
      fileName += '.html'
      myFs.mkdirpSync(pathName)
      await promisify(myFs.writeFile.bind(myFs))(path.join(pathName, fileName), decHtml, 'utf8')
      return fileName
    } catch (err) {
      this.log.warn(err)
    }
  }
}
