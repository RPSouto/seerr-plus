import { getRepository } from '@server/datasource';
import { User } from '@server/entity/User';
import PreparedEmail from '@server/lib/email';
import { getSettings } from '@server/lib/settings';
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
    if (!emailSettings.enabled) return;
    const users = recipientUsers ?? (await getRepository(User).find());
    const email = new PreparedEmail(emailSettings);
    const applicationUrl = settings.main.applicationUrl?.replace(/\/$/, '');
    const movieClubUrl = applicationUrl
      ? `${applicationUrl}/movie-club`
      : undefined;
    const recipients = users.filter((user) => Boolean(user.email));
    const results = await Promise.allSettled(
      recipients.map((user) =>
        email.send({
          template: path.join(__dirname, '../../templates/email/test-email'),
          message: { to: user.email, subject },
          locals: {
            body: movieClubUrl
              ? `${body}\n\nOpen Movie Club: ${movieClubUrl}`
              : body,
            applicationUrl: movieClubUrl,
            applicationTitle: settings.main.applicationTitle,
            recipientEmail: user.email,
            recipientName: user.displayName,
          },
        })
      )
    );
    logger.info('Movie Club email notification completed', {
      label: 'Seerr+',
      subject,
      recipients: recipients.length,
      failed: results.filter((result) => result.status === 'rejected').length,
    });
  } catch (error) {
    logger.error('Movie Club email notification failed', {
      label: 'Seerr+',
      subject,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
