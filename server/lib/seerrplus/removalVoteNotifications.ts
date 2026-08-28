import type Media from '@server/entity/Media';
import type { User } from '@server/entity/User';
import { Notification } from '@server/lib/notifications';
import { getSettings } from '@server/lib/settings';
import { sendMovieClubEmail } from './movieClubNotifications';

const mediaUrlPath = (media: Media) =>
  media.mediaType === 'tv' ? `/tv/${media.tmdbId}` : `/movie/${media.tmdbId}`;

const mediaDisplayTitle = (media: Media) =>
  `${media.mediaType === 'tv' ? 'Series' : 'Movie'} #${media.tmdbId}`;

export const sendRemovalVoteNotification = async ({
  media,
  mediaTitle,
  requestedBy,
  recipients,
  reason,
}: {
  media: Media;
  mediaTitle?: string | null;
  requestedBy: User;
  recipients: User[];
  reason?: string | null;
}) => {
  const applicationUrl = getSettings().main.applicationUrl?.replace(/\/$/, '');
  const actionUrl = applicationUrl
    ? `${applicationUrl}/votes`
    : undefined;
  const title = mediaTitle?.trim() || mediaDisplayTitle(media);

  await sendMovieClubEmail(
    {
      en: `Removal vote opened: ${title}`,
      pt: `Votação de remoção aberta: ${title}`,
    },
    {
      en: `${requestedBy.displayName} asked if "${title}" should be removed from Plex. Vote to say if you agree with removing it or prefer to keep it.${
        reason ? `\n\nReason: ${reason}` : ''
      }`,
      pt: `${requestedBy.displayName} pediu opinião sobre remover "${title}" do Plex. Vota para dizer se concordas com a remoção ou se preferes manter.${
        reason ? `\n\nMotivo: ${reason}` : ''
      }`,
    },
    recipients,
    {
      actionLabel: {
        en: 'Open removal vote',
        pt: 'Abrir votação de remoção',
      },
      actionUrl,
      highlightMovie: {
        title,
        tmdbId: media.tmdbId,
        requestedBy: requestedBy.displayName,
      },
      notificationType: Notification.REMOVAL_VOTE,
    }
  );
};

export { mediaUrlPath };
