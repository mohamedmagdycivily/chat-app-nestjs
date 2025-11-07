/* eslint-disable @typescript-eslint/no-var-requires */
require('ts-node/register');

require('./umzug.ts').migrator.runAsCLI();
