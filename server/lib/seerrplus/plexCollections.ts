import logger from '@server/logger';
import type { RequestInterestAddedEvent } from './events';
import { seerrPlusEvents } from './events';

export interface PlexCollectionSyncAdapter {
  addRequestInterest(event: RequestInterestAddedEvent): Promise<void>;
}

let adapter: PlexCollectionSyncAdapter | undefined;
let initialized = false;

export const registerPlexCollectionSyncAdapter = (
  syncAdapter: PlexCollectionSyncAdapter
): void => {
  adapter = syncAdapter;
};

export const initializePlexCollectionSync = (): void => {
  if (initialized) {
    return;
  }
  initialized = true;

  seerrPlusEvents.onInterestAdded(async (event) => {
    if (process.env.SEERR_PLUS_PLEX_COLLECTION_SYNC !== 'true') {
      return;
    }

    if (!adapter) {
      logger.warn(
        'Plex collection sync is enabled, but no Seerr+ adapter is registered',
        { label: 'Seerr+' }
      );
      return;
    }

    try {
      await adapter.addRequestInterest(event);
    } catch (error) {
      logger.error('Unable to synchronize Seerr+ Plex collection', {
        label: 'Seerr+',
        requestId: event.request.id,
        userId: event.user.id,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }
  });
};
