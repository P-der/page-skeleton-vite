import EventEmitter from 'events'
import Skeleton from './skeleton'
import {createLog} from './util'
export default class Server extends EventEmitter {
    sockets
    skeleton
    log
    constructor(options) {
        super()
        this.sockets = []
        this.skeleton = null
        this.log = createLog()
        this.skeleton = new Skeleton({}, this.log)
        // this.log = createLog(options)
    }
}