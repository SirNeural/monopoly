module.exports = {
    devServer: {
        watchOptions: {
            poll: 2000
        }
    },
    chainWebpack: config => {
        config.module
            .rule('ts')
            .use('ts-loader')
            .loader('ts-loader')
            .tap(options => {
                options.transpileOnly = true
                options.experimentalWatchApi = true
                options.reportFiles = ['!node_modules/**/*']
                return options
            })
        config
            .plugin('fork-ts-checker')
            .tap(args => {
                args[0].async = true
                args[0].silent = false
                args[0].reportFiles = ['!node_modules/**/*']
                return args
            })
    }
}