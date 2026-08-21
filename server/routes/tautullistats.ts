import TautulliAPI from '@server/api/tautulli';
import { MediaType } from '@server/constants/media';
import { getRepository } from '@server/datasource';
import Media from '@server/entity/Media';
import { getSettings } from '@server/lib/settings';
import type { RequestHandler } from 'express';
import { In } from 'typeorm';

type TautulliStatsCache = {
  streams: number;
  movies: number;
  series: number;
  currentStreams: {
    title: string;
    mediaType?: string;
    pageUrl?: string;
    ratingKey?: string;
    thumb?: string;
    imageUrl?: string;
  }[];
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
    const ratingKeys = [
      ...new Set(
        stats.currentStreams
          .map((stream) => stream.ratingKey)
          .filter((ratingKey): ratingKey is string => Boolean(ratingKey))
      ),
    ];
    const mediaByRatingKey = new Map<string, Media>();

    if (ratingKeys.length) {
      const relatedMedia = await getRepository(Media).find({
        where: [
          { ratingKey: In(ratingKeys) },
          { ratingKey4k: In(ratingKeys) },
        ],
      });

      relatedMedia.forEach((media) => {
        if (media.ratingKey) {
          mediaByRatingKey.set(media.ratingKey, media);
        }
        if (media.ratingKey4k) {
          mediaByRatingKey.set(media.ratingKey4k, media);
        }
      });
    }

    tautulliStatsCache = {
      ...stats,
      currentStreams: stats.currentStreams.map((stream, index) => {
        const media = stream.ratingKey
          ? mediaByRatingKey.get(stream.ratingKey)
          : undefined;

        return {
          ...stream,
          pageUrl:
            media?.mediaType === MediaType.MOVIE
              ? `/movie/${media.tmdbId}`
              : media?.mediaType === MediaType.TV
                ? `/tv/${media.tmdbId}`
                : undefined,
          imageUrl: stream.thumb
            ? `/api/v1/tautulli-stats/stream-image?index=${index}&img=${encodeURIComponent(
                stream.thumb
              )}`
            : undefined,
        };
      }),
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

export const getTautulliStreamImage: RequestHandler = async (req, res, next) => {
  const settings = getSettings().tautulli;
  const image = typeof req.query.img === 'string' ? req.query.img : '';

  if (!settings.hostname || !settings.port || !settings.apiKey || !image) {
    return next({ status: 404, message: 'Tautulli image not found.' });
  }

  try {
    const response = await new TautulliAPI(settings).getImage(image);
    res.setHeader('Cache-Control', 'private, max-age=60');
    res.setHeader('Content-Type', response.contentType ?? 'image/jpeg');
    return res.send(response.data);
  } catch (error) {
    return next({
      status: 502,
      message:
        error instanceof Error
          ? error.message
          : 'Unable to read Tautulli image.',
    });
  }
};
