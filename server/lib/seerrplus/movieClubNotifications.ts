import { getRepository } from '@server/datasource';
import { User } from '@server/entity/User';
import PreparedEmail from '@server/lib/email';
import DiscordAgent from '@server/lib/notifications/agents/discord';
import PushbulletAgent from '@server/lib/notifications/agents/pushbullet';
import PushoverAgent from '@server/lib/notifications/agents/pushover';
import WebPushAgent from '@server/lib/notifications/agents/webpush';
import { Notification } from '@server/lib/notifications';
import { getSettings, NotificationAgentKey } from '@server/lib/settings';
import logger from '@server/logger';
import path from 'path';

export interface MovieClubEmailMovie {
  title: string;
  tmdbId: number;
  releaseDate?: string;
  posterPath?: string;
  overview?: string;
  voteCount?: number;
  requestedBy?: string;
}

export type MovieClubEmailText =
  | string
  | {
      en: string;
      pt: string;
    };

interface MovieClubEmailOptions {
  actionLabel?: MovieClubEmailText;
  actionUrl?: string;
  movies?: MovieClubEmailMovie[];
  highlightMovie?: MovieClubEmailMovie;
  notificationType?: Notification;
}

const posterUrl = (posterPath?: string) =>
  posterPath
    ? `https://image.tmdb.org/t/p/w600_and_h900_bestv2${posterPath}`
    : undefined;

const movieUrl = (applicationUrl: string | undefined, tmdbId?: number) =>
  applicationUrl && tmdbId ? `${applicationUrl}/movie/${tmdbId}` : undefined;

const isPortuguese = (user: User) =>
  user.settings?.locale?.toLowerCase().startsWith('pt') ?? false;

const localizedText = (text: MovieClubEmailText, portuguese: boolean) =>
  typeof text === 'string' ? text : portuguese ? text.pt : text.en;

const localizedLabels = (portuguese: boolean) =>
  portuguese
    ? {
        greeting: 'Olá',
        sectionTitle: 'Filmes',
        releaseDate: 'Data de estreia',
        votes: 'Votos',
        requestedBy: 'Pedido por',
        readSynopsis: 'Ler sinopse no Seerr+',
        fallbackAction: 'Abrir Movie Club',
        openMovieClub: 'Abrir Movie Club',
        footer: 'Este email foi enviado pelo Seerr+ Plus.',
      }
    : {
        greeting: 'Hi',
        sectionTitle: 'Films',
        releaseDate: 'Release date',
        votes: 'Votes',
        requestedBy: 'Requested by',
        readSynopsis: 'Read synopsis in Seerr+',
        fallbackAction: 'Open Movie Club',
        openMovieClub: 'Open Movie Club',
        footer: 'This email was sent by Seerr+ Plus.',
      };

export const sendMovieClubEmail = async (
  subject: MovieClubEmailText,
  body: MovieClubEmailText,
  recipientUsers?: User[],
  options: MovieClubEmailOptions = {}
) => {
  try {
    const settings = getSettings();
    const emailSettings = settings.notifications.agents.email;
    const users = recipientUsers ?? (await getRepository(User).find());
    const email = emailSettings.enabled
      ? new PreparedEmail(emailSettings)
      : undefined;
    const applicationUrl = settings.main.applicationUrl?.replace(/\/$/, '');
    const movieClubUrl = applicationUrl
      ? `${applicationUrl}/movie-club`
      : undefined;
    const highlightMovie = options.highlightMovie ?? options.movies?.[0];
    const actionUrl = options.actionUrl ?? movieClubUrl;
    const notificationType = options.notificationType ?? Notification.MOVIE_CLUB;
    const movies =
      options.movies?.map((movie) => ({
        ...movie,
        actionUrl: movieUrl(applicationUrl, movie.tmdbId),
        imageUrl: posterUrl(movie.posterPath),
      })) ?? [];
    const recipients = email
      ? users.filter(
          (user) =>
            Boolean(user.email) &&
            (!user.settings ||
              user.settings.hasNotificationType(
                NotificationAgentKey.EMAIL,
                notificationType
              ))
        )
      : [];
    const results = email
      ? await Promise.allSettled(
          recipients.map((user) => {
            const portuguese = isPortuguese(user);
            const labels = localizedLabels(portuguese);
            const emailSubject = localizedText(subject, portuguese);

            return email.send({
              template: path.join(__dirname, '../../templates/email/movie-club'),
              message: { to: user.email, subject: emailSubject },
              locals: {
                subject: emailSubject,
                body: localizedText(body, portuguese),
                applicationUrl: movieClubUrl,
                applicationTitle: settings.main.applicationTitle,
                actionUrl,
                actionLabel: options.actionLabel
                  ? localizedText(options.actionLabel, portuguese)
                  : labels.fallbackAction,
                labels,
                movies,
                highlightMovie: highlightMovie
                  ? {
                      ...highlightMovie,
                      actionUrl: movieUrl(applicationUrl, highlightMovie.tmdbId),
                      imageUrl: posterUrl(highlightMovie.posterPath),
                    }
                  : undefined,
                recipientEmail: user.email,
                recipientName: user.displayName,
              },
            });
          })
        )
      : [];
    const pushbullet = new PushbulletAgent();
    const pushover = new PushoverAgent();
    const webpush = new WebPushAgent();
    const directResults = await Promise.allSettled(
      users.flatMap((user) => {
        const portuguese = isPortuguese(user);
        const labels = localizedLabels(portuguese);
        const actionLabel = options.actionLabel
          ? localizedText(options.actionLabel, portuguese)
          : labels.openMovieClub;
        const notificationBody = actionUrl
          ? `${localizedText(body, portuguese)}\n\n${actionLabel}: ${actionUrl}`
          : localizedText(body, portuguese);

        return [
          pushbullet.send(notificationType, {
            subject: localizedText(subject, portuguese),
            message: notificationBody,
            notifySystem: false,
            notifyAdmin: false,
            notifyUser: user,
          }),
          pushover.send(notificationType, {
            subject: localizedText(subject, portuguese),
            message: notificationBody,
            notifySystem: false,
            notifyAdmin: false,
            notifyUser: user,
          }),
          ...(webpush.shouldSend()
            ? [
                webpush.send(notificationType, {
                  subject: localizedText(subject, portuguese),
                  message: localizedText(body, portuguese),
                  notifySystem: false,
                  notifyAdmin: false,
                  notifyUser: user,
                  image: posterUrl(highlightMovie?.posterPath),
                }),
              ]
            : []),
        ];
      })
    );
    const fallbackSubject = localizedText(subject, false);
    const fallbackActionLabel = options.actionLabel
      ? localizedText(options.actionLabel, false)
      : 'Open Movie Club';
    const fallbackBody = actionUrl
      ? `${localizedText(body, false)}\n\n${fallbackActionLabel}: ${actionUrl}`
      : localizedText(body, false);
    const discord = new DiscordAgent();
    const discordResult = discord.shouldSend()
      ? await discord.send(notificationType, {
          subject: fallbackSubject,
          message: fallbackBody,
          notifySystem: true,
          notifyAdmin: false,
          notifyUsers: users,
        })
      : true;
    logger.info('Movie Club email notification completed', {
      label: 'Seerr+',
      subject: fallbackSubject,
      recipients: recipients.length,
      failed: results.filter((result) => result.status === 'rejected').length,
    });
    logger.info('Movie Club extra notification channels completed', {
      label: 'Seerr+',
      subject: fallbackSubject,
      directDeliveries: directResults.length,
      failed:
        directResults.filter(
          (result) =>
            result.status === 'rejected' ||
            (result.status === 'fulfilled' && !result.value)
        ).length + Number(!discordResult),
    });
  } catch (error) {
    logger.error('Movie Club notification delivery failed', {
      label: 'Seerr+',
      subject: localizedText(subject, false),
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
