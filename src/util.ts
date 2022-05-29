import {promisify} from 'util'
import path from 'path'
import fs from 'fs'

export const genScriptContent = async function() {
    const sourcePath = path.resolve(__dirname, './script/index.js')
    const result = await promisify(fs.readFile)(sourcePath, 'utf-8')
    return result
}
export const createLog = function() {
    return console.log
}