var overrides = require('./config.dev.js').default;

//----------- Define default configs here ----------

const title = 'TrialsTracker';
const scope = 'oada.yield:all';
const defaults = {
	scope,
  title,
};

//--------------------------------------------------
if (process.env.REACT_APP_PROD_DEV) {
  overrides = require('./config.prod-dev.js').default;
} else if (process.env.NODE_ENV === 'production') {
  overrides = require('./config.prod.js').default;
}

var toExport =  {...defaults, ...overrides};

const oadaDomain = toExport.oadaDomain;
const websiteDomain = toExport.websiteDomain;
const redirect = toExport.websiteDomain + '/oauth2/redirect.html';
const metadata = toExport.metadata;
const devtoolsPort = toExport.devtoolsPort;
const defaultNewConnectionURL = toExport.defaultNewConnectionURL;

module.exports = toExport;
