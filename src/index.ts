import type {Options} from './types/index'
import Server from './server'

export default function pageSkeletonPlugin(options: Options) {
    const server = new Server()
    server.listen().catch(err => server.log.warn(err))
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
  
      // 代码转译，这个函数的功能类似于 `webpack` 的 `loader`

    }
  }