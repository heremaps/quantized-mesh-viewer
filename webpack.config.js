const path = require('path')
const CleanWebpackPlugin = require('clean-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')

module.exports = [
  {
    entry: {
      map: './src/map/index.js',
      tile: './src/tile/index.js'
    },
    output: {
      filename: '[name].bundle.js',
      path: path.resolve(__dirname, './dist')
    },
    externals: {
      'cesium': 'Cesium',
      'three': 'THREE',
      'dat.gui': 'dat'
    },
    devtool: 'inline-source-map',
    devServer: {
      contentBase: path.join(__dirname, './'),
      publicPath: '/dist/'
    },
    plugins: [
      new CleanWebpackPlugin(['dist']),
      new CopyWebpackPlugin([
        { from: './node_modules/three', to: `./vendor/three` },
        { from: './node_modules/cesium', to: `./vendor/cesium` },
        { from: './node_modules/dat.gui', to: `./vendor/dat.gui`, toType: 'dir' }
      ])
    ]
  }
]
