import type {Options} from './types/index'
import Server from './server'
import {addScriptTag} from './util'
import {staticPath, defaultOptions} from './config'
export default function pageSkeletonPlugin(options: Options) {
    const server = new Server({...defaultOptions, ...options})
    const config = {
      env: null
    }
    server.listen().catch(err => server.log.warn(err))
    const insertScriptToClient = function(htmlData) { // eslint-disable-line func-names
      // at develop phase, insert the interface code
      if (config.env.mode !== 'production' && htmlData) {
        const { port } = options
        const clientEntry = `http://localhost:${port}/${staticPath}/index.bundle.js`
        const oldHtml = htmlData
        const newHtml = addScriptTag(oldHtml, clientEntry, port)
        return newHtml
      }
      return htmlData
    }
    return {
      // 插件名称
      name: 'vite:page-skeleton',
      apply: 'serve',
      buildStart() {
        console.log('build start')
      },
  
      handleHotUpdate(ctx) {
        console.log('hot')
      },
      config(_, env) {
        config.env = env
      },
      transformIndexHtml(html) {
        return insertScriptToClient(html)
      },
    }
  }