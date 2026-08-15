import { getRepository } from '@server/datasource';
import { User } from '@server/entity/User';
import PreparedEmail from '@server/lib/email';
import DiscordAgent from '@server/lib/notifications/agents/discord';
import PushbulletAgent from '@server/lib/notifications/agents/pushbullet';
import PushoverAgent from '@server/lib/notifications/agents/pushover';
import { Notification } from '@server/lib/notifications';
import { getSettings, NotificationAgentKey } from '@server/lib/settings';
import logger from '@server/logger';
import path from 'path';

export const sendMovieClubEmail = async (
  subject: string,
  body: string,
  recipientUsers?: User[]
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
    const notificationBody = movieClubUrl
      ? `${body}\n\nOpen Movie Club: ${movieClubUrl}`
      : body;
    const recipients = email
      ? users.filter(
          (user) =>
            Boolean(user.email) &&
            (!user.settings ||
              user.settings.hasNotificationType(
                NotificationAgentKey.EMAIL,
                Notification.MOVIE_CLUB
              ))
        )
      : [];
    const results = email
      ? await Promise.allSettled(
          recipients.map((user) =>
            email.send({
              template: path.join(
                __dirname,
                '../../templates/email/test-email'
              ),
              message: { to: user.email, subject },
              locals: {
                body: notificationBody,
                applicationUrl: movieClubUrl,
                applicationTitle: settings.main.applicationTitle,
                recipientEmail: user.email,
                recipientName: user.displayName,
              },
            })
          )
        )
      : [];
    const pushbullet = new PushbulletAgent();
    const pushover = new PushoverAgent();
    const directResults = await Promise.allSettled(
      users.flatMap((user) => [
        pushbullet.send(Notification.MOVIE_CLUB, {
          subject,
          message: notificationBody,
          notifySystem: false,
          notifyAdmin: false,
          notifyUser: user,
        }),
        pushover.send(Notification.MOVIE_CLUB, {
          subject,
          message: notificationBody,
          notifySystem: false,
          notifyAdmin: false,
          notifyUser: user,
        }),
      ])
    );
    const discord = new DiscordAgent();
    const discordResult = discord.shouldSend()
      ? await discord.send(Notification.MOVIE_CLUB, {
          subject,
          message: notificationBody,
          notifySystem: true,
          notifyAdmin: false,
          notifyUsers: users,
        })
      : true;
    logger.info('Movie Club email notification completed', {
      label: 'Seerr+',
      subject,
      recipients: recipients.length,
      failed: results.filter((result) => result.status === 'rejected').length,
    });
    logger.info('Movie Club extra notification channels completed', {
      label: 'Seerr+',
      subject,
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
      subject,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
