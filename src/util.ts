import {promisify} from 'util'
import path from 'path'
import fs from 'fs'
import {html_beautify as htmlBeautify}  from 'js-beautify'
import { minify } from 'html-minifier'
import { html2json, json2html } from 'html2json'
import QRCode from 'qrcode'
import os from 'os'
import { htmlBeautifyConfig } from './config'

export const genScriptContent = async function() {
    const sourcePath = path.resolve(__dirname, './script/index.js')
    const result = await promisify(fs.readFile)(sourcePath, 'utf-8')
    return result
}
export const createLog = function(options) {
  return console
}

export const addScriptTag = function addScriptTag(html, src, port) {
    const token = html.split('</body>')
    if (token.length < 2) return html
    const scriptTag = `
      <script>
        window._pageSkeletonSocketPort = ${port}
      </script>
      <script type="text/javascript" src="${src}" defer></script>
      `
    return `${token[0]}${scriptTag}</body>${token[1]}`
  }

export const sockWrite = (sockets, type, data) => {
    sockets.forEach((sock) => {
      sock.write(JSON.stringify({
        type, data
      }))
    })
  }
export function sleep(duration) {
  return new Promise((resolve) => {
    setTimeout(resolve, duration)
  })
}
export function htmlMinify(html, options) {
  return options === false ? htmlBeautify(html, htmlBeautifyConfig) : minify(html, options)
}

export const collectImportantComments = (css) => {
  const once = new Set()
  const cleaned = css.replace(/(\/\*![\s\S]*?\*\/)\n*/gm, (match, p1) => {
    once.add(p1)
    return ''
  })
  const combined = Array.from(once)
  combined.push(cleaned)
  return combined.join('\n')
}

export 
const addDprAndFontSize = (html) => {
  const json = html2json(html)
  const rootElement = json.child.filter(c => c.tag === 'html')[0]
  const oriAttr = rootElement.attr
  const style = oriAttr.style || []
  const index = style.indexOf('font-size:')
  if (index > -1) {
    style[index + 1] = '124.2px;'
  } else {
    style.push('font-size:')
    style.push('124.2px;')
  }
  const rootAttr = Object.assign(oriAttr, {
    'data-dpr': '3',
    style
  })
  rootElement.attr = rootAttr
  return json2html(json)
}

export const generateQR = async (text) => {
  try {
    return await QRCode.toDataURL(text)
  } catch (err) {
    return Promise.reject(err)
  }
}
export const getLocalIpAddress = () => {
  const interfaces = os.networkInterfaces()
  return 'localhost'
  // for (const devName in interfaces) { // eslint-disable-line guard-for-in
  //   const iface = interfaces[devName]
  //   for (const alias of iface) {
  //     if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
  //       return alias.address
  //     }
  //   }
  // }
}