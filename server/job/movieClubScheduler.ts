import TheMovieDb from '@server/api/themoviedb';
import { getRepository } from '@server/datasource';
import MovieClubSession, {
  MovieClubSessionStatus,
} from '@server/entity/MovieClubSession';
import { sendMovieClubEmail } from '@server/lib/seerrplus/movieClubNotifications';
import logger from '@server/logger';
import schedule from 'node-schedule';
import { IsNull, LessThanOrEqual } from 'typeorm';

let scheduler: schedule.Job | undefined;
let running = false;

const announceVoting = async (session: MovieClubSession) => {
  const tmdb = new TheMovieDb();
  const titles = await Promise.all(
    session.candidates.map(async (candidate) => {
      const movie = await tmdb.getMovie({ movieId: candidate.media.tmdbId });
      return movie.title;
    })
  );
  await sendMovieClubEmail(
    'Movie Club voting is now open',
    `This week's Movie Club candidates are: ${titles.join(
      ', '
    )}. Cast your vote in Seerr+ before ${session.closesAt.toLocaleString()}.`
  );
};

export const processScheduledMovieClubSessions = async () => {
  if (running) return;
  running = true;
  try {
    const repository = getRepository(MovieClubSession);
    const now = new Date();
    const sessions = await repository.find({
      where: [
        {
          status: MovieClubSessionStatus.SCHEDULED,
          startsAt: LessThanOrEqual(now),
        },
        {
          status: MovieClubSessionStatus.VOTING,
          startsAt: LessThanOrEqual(now),
          startNotificationSentAt: IsNull(),
        },
      ],
      relations: { candidates: { media: true } },
    });

    for (const session of sessions) {
      if (session.status === MovieClubSessionStatus.SCHEDULED) {
        const activation = await repository.update(
          {
            id: session.id,
            status: MovieClubSessionStatus.SCHEDULED,
            startsAt: LessThanOrEqual(now),
          },
          { status: MovieClubSessionStatus.VOTING }
        );
        if (!activation.affected) continue;
        session.status = MovieClubSessionStatus.VOTING;
      }
      await announceVoting(session);
      await repository.update(
        { id: session.id, status: MovieClubSessionStatus.VOTING },
        { startNotificationSentAt: new Date() }
      );
      logger.info('Started scheduled Movie Club vote', {
        label: 'Seerr+',
        sessionId: session.id,
        startsAt: session.startsAt,
      });
    }
  } catch (error) {
    logger.error('Failed to process scheduled Movie Club votes', {
      label: 'Seerr+',
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    running = false;
  }
};

export const startMovieClubScheduler = () => {
  if (scheduler) return;
  void processScheduledMovieClubSessions();
  scheduler = schedule.scheduleJob('*/15 * * * * *', () => {
    void processScheduledMovieClubSessions();
  });
  logger.info('Movie Club scheduler loaded', { label: 'Seerr+' });
};
