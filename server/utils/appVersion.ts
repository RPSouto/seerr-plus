import logger from '@server/logger';
import { existsSync, readFileSync } from 'fs';
import path from 'path';

const COMMIT_TAG_PATH = path.join(__dirname, '../../committag.json');
const SEERR_PLUS_VERSION_PATH = path.join(
  __dirname,
  '../../SEERR_PLUS_VERSION'
);
let commitTag = 'local';

if (existsSync(COMMIT_TAG_PATH)) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  commitTag = require(COMMIT_TAG_PATH).commitTag;
  logger.info(`Commit Tag: ${commitTag}`);
}

export const getCommitTag = (): string => {
  return commitTag;
};

export const getSeerrPlusVersion = (): string => {
  try {
    if (existsSync(SEERR_PLUS_VERSION_PATH)) {
      const version = readFileSync(SEERR_PLUS_VERSION_PATH, 'utf-8').trim();
      if (version) return version;
    }
  } catch {
    // ignore
  }

  if (commitTag && commitTag.startsWith('seerr-plus')) {
    return commitTag;
  }

  return 'seerr-plus-v1.8.460';
};

export const getAppVersion = (): string => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { version } = require('../../package.json');

  let finalVersion = version;

  if (version === '0.1.0') {
    finalVersion = `develop-${getCommitTag()}`;
  }

  return finalVersion;
};
