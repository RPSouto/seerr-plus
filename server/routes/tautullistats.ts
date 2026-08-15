import TautulliAPI from '@server/api/tautulli';
import { getSettings } from '@server/lib/settings';
import type { RequestHandler } from 'express';

type TautulliStatsCache = {
  streams: number;
  movies: number;
  series: number;
  updatedAt: string;
};

const TAUTULLI_STATS_CACHE_MS = 60 * 1000;
const TAUTULLI_STATS_FORCE_REFRESH_MS = 5 * 1000;
let tautulliStatsCache: TautulliStatsCache | undefined;

export const getTautulliStats: RequestHandler = async (req, res, next) => {
  const settings = getSettings().tautulli;
  if (!settings.hostname || !settings.port || !settings.apiKey) {
    return res.json({ configured: false });
  }

  const now = Date.now();
  const cacheAge = tautulliStatsCache
    ? now - Date.parse(tautulliStatsCache.updatedAt)
    : Number.POSITIVE_INFINITY;
  const forceRefresh =
    req.query.refresh === 'true' &&
    cacheAge >= TAUTULLI_STATS_FORCE_REFRESH_MS;

  if (
    tautulliStatsCache &&
    !forceRefresh &&
    cacheAge < TAUTULLI_STATS_CACHE_MS
  ) {
    return res.json({ configured: true, ...tautulliStatsCache });
  }

  try {
    const stats = await new TautulliAPI(settings).getServerStats();
    tautulliStatsCache = {
      ...stats,
      updatedAt: new Date().toISOString(),
    };
    return res.json({ configured: true, ...tautulliStatsCache });
  } catch (error) {
    if (tautulliStatsCache) {
      return res.json({
        configured: true,
        ...tautulliStatsCache,
        stale: true,
      });
    }
    return next({
      status: 502,
      message:
        error instanceof Error
          ? error.message
          : 'Unable to read Tautulli statistics.',
    });
  }
};
