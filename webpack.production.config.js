module.exports = {
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
        "presets": ["react", "es2015", "stage-0"],
        "plugins": [
          ["transform-decorators-legacy"]
        ]
      }
    },
	{
	  test: /\.png$/,
      loader: 'url-loader?limit=8192'
	}]
  },
  postcss: [
	require('autoprefixer')
  ]
};
