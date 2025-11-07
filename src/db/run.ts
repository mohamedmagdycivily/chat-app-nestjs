/* eslint-disable @typescript-eslint/no-var-requires */
require('ts-node/register');

require('./main/umzug.ts').migrator.runAsCLI();
