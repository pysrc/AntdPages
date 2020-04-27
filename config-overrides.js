const { override, fixBabelImports} = require('customize-cra');

const path = require('path');
const paths = require('react-scripts/config/paths');
paths.appBuild = path.join(path.dirname(paths.appBuild), 'docs');


module.exports = override(
  fixBabelImports('import', {
  	libraryName: 'antd',
  	libraryDirectory: 'es',
  	style: 'css',
  }),
);