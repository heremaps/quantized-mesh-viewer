const path = require('path')
const CleanWebpackPlugin = require('clean-webpack-plugin')

module.exports = {
  entry: {
    app: './src/app.js'
  },
  output: {
    filename: 'app.bundle.js',
    path: path.resolve(__dirname, 'dist')
  },
  externals: {
    'cesium': 'Cesium'
  },
  devtool: 'inline-source-map',
  devServer: {
    contentBase: path.join(__dirname, './'),
    publicPath: '/dist/'
  },
  plugins: [
    new CleanWebpackPlugin(['dist'])
  ]
}
