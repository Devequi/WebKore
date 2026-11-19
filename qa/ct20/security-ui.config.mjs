import config from './playwright.config.mjs';
export default { ...config, testMatch: 'security-ui.cases.mjs', reporter: [['list']],
  outputDir: `../../test-results/security/${process.env.WEBKORE_CT20_DB_NAME}/browser` };
