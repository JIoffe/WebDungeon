const path = require('path');

module.exports = [
  {
    entry: './js/client/main.js',
    output: {
      filename: 'bundle-client.min.js',
      path: path.resolve(__dirname, 'dist')
    },
    plugins: [
    ],
    mode: 'development'
  }
  // {
  //   entry: './js/editor/main.js',
  //   output: {
  //     filename: 'editor-bundle.min.js',
  //     path: path.resolve(__dirname, 'dist')
  //   },
  //   plugins: [
  //   ],
  //   mode: 'development'
  // }
];