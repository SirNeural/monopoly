module.exports = {
    devServer: {
        watchOptions: {
            poll: 1000
        }
    },
    chainWebpack: config => {
        config.module
            .rule('ts')
            .use('ts-loader')
            .loader('ts-loader')
            .tap(options => {
                options.transpileOnly = true
                options.reportFiles = ['!node_modules/**/*']
                return options
            })
        config
            .plugin('fork-ts-checker')
            .tap(args => {
                args[0].reportFiles = ['!node_modules/**/*']
                return args
            })
    }
}