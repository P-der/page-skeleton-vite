import puppeteer from 'puppeteer'
import { genScriptContent } from './util'
export default class Skeleton {
    options: {}
    browser: any
    scriptContent: string
    pages: Set<unknown>
    log: any
    constructor(options = {}, log) {
        this.options = options
        this.browser = null
        this.scriptContent = ''
        this.pages = new Set()
        this.log = log
        this.initialize()
      }
    async initialize() {
        // const { headless } = this.options
        const { log } = this
        try {
        // load script content from `script` folder
        this.scriptContent = await genScriptContent()
        // Launch the browser
        this.browser = await puppeteer.launch({ headless: true })
        } catch (err) {
            log(err)
        }
    }
}