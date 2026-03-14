const path = require('path');

module.exports = {
  mode: 'production',
  entry: {
    content: './src/content.ts',
    options: './src/options.ts',
    background: './src/background.ts',
  },
  output: {
    path: path.resolve(__dirname, 'EnvIcon/js'),
    filename: '[name].js',
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: 'ts-loader',
          options: {
            compilerOptions: {
              noEmit: false,
            },
          },
        },
        exclude: /node_modules/,
      },
    ],
  },
};
