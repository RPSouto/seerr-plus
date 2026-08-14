import RadarrAPI from '@server/api/servarr/radarr';
import SonarrAPI from '@server/api/servarr/sonarr';
import TheMovieDb from '@server/api/themoviedb';
import { MediaStatus, MediaType } from '@server/constants/media';
import { getRepository } from '@server/datasource';
import Media from '@server/entity/Media';
import { getSettings } from '@server/lib/settings';

export const removeMediaFromService = async (
  media: Media,
  is4k: boolean
): Promise<void> => {
  const settings = getSettings();
  const isMovie = media.mediaType === MediaType.MOVIE;
  let serviceSettings = isMovie
    ? settings.radarr.find(
        (server) => server.isDefault && server.is4k === is4k
      )
    : settings.sonarr.find(
        (server) => server.isDefault && server.is4k === is4k
      );
  const serviceId = is4k ? media.serviceId4k : media.serviceId;

  if (serviceId != null && serviceId >= 0 && serviceSettings?.id !== serviceId) {
    serviceSettings = isMovie
      ? settings.radarr.find((server) => server.id === serviceId)
      : settings.sonarr.find((server) => server.id === serviceId);
  }

  if (!serviceSettings) {
    throw new Error(
      `No ${is4k ? '4K ' : ''}${isMovie ? 'Radarr' : 'Sonarr'} server configured to delete media files`
    );
  }

  if (isMovie) {
    const radarr = new RadarrAPI({
      apiKey: serviceSettings.apiKey,
      url: RadarrAPI.buildUrl(serviceSettings, '/api/v3'),
    });
    await radarr.removeMovie(media.tmdbId);
  } else {
    const sonarr = new SonarrAPI({
      apiKey: serviceSettings.apiKey,
      url: SonarrAPI.buildUrl(serviceSettings, '/api/v3'),
    });
    const tv = await new TheMovieDb().getTvShow({ tvId: media.tmdbId });
    const tvdbId = tv.external_ids.tvdb_id ?? media.tvdbId;
    if (!tvdbId) {
      throw new Error('TVDB ID not found');
    }
    await sonarr.removeSeries(tvdbId);
    media.seasons.forEach((season) => {
      season[is4k ? 'status4k' : 'status'] = MediaStatus.DELETED;
    });
  }

  media[is4k ? 'status4k' : 'status'] = MediaStatus.DELETED;
  media.resetServiceData(is4k);
  await getRepository(Media).save(media);
};
