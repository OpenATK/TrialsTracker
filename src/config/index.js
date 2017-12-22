var overrides = require('./config.dev.js').default;

//----------- Define default configs here ----------

export const title = 'TrialsTracker';
export const scope = 'oada.awesome:all';
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

export const oadaDomain = toExport.oadaDomain;
export const websiteDomain = toExport.websiteDomain;
export const redirect = toExport.websiteDomain + '/oauth2/redirect.html';
export const metadata = toExport.metadata;
export const devtoolsPort = toExport.devtoolsPort;
export const defaultNewConnectionURL = toExport.defaultNewConnectionURL;

export default toExport;
