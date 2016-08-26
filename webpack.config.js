module.exports = {
  entry:"./src/main.js",
//  devtool: 'eval',
  output: {
    path: __dirname + "/dist",
    filename: "bundle.js"
  },
  module: {
    loaders: [{
      test: /\.css?$/,
      loader: 'style!css?modules&localIdentName=[name]---[local]---[hash:base64:5]!postcss'
    },
    {
      test: /\.js?$/,
      exclude: /node_modules/,
      loader: 'babel',
      query: {
        "presets": ["react", "es2015", "stage-0"], //, "react-hmre"],
        "plugins": [
          ["transform-decorators-legacy"]
        ]
      }
    },{
      test: /\.png$/,
      loader: 'url-loader?limit=8192'
    },{
      test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
      loader: "url-loader?limit=10000&minetype=application/font-woff"
    },{ 
      test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/, 
      loader: "file-loader"
    }]
  },
  postcss: [
    require('autoprefixer')
  ]
};
