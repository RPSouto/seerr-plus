import TheMovieDb from '@server/api/themoviedb';
import { getRepository } from '@server/datasource';
import MovieClubSession, {
  MovieClubSessionStatus,
} from '@server/entity/MovieClubSession';
import type { MovieClubEmailMovie } from '@server/lib/seerrplus/movieClubNotifications';
import { sendMovieClubEmail } from '@server/lib/seerrplus/movieClubNotifications';
import logger from '@server/logger';
import { resolveMovieClubSession } from '@server/routes/movieclub';
import schedule from 'node-schedule';
import { IsNull, LessThanOrEqual } from 'typeorm';

let scheduler: schedule.Job | undefined;
let running = false;

const announceVoting = async (session: MovieClubSession) => {
  const tmdb = new TheMovieDb();
  const movies = await Promise.all(
    session.candidates.map(async (candidate) => {
      const movie = await tmdb.getMovie({ movieId: candidate.media.tmdbId });
      return {
        title: movie.title,
        tmdbId: movie.id,
        releaseDate: movie.release_date,
        posterPath: movie.poster_path,
        overview: movie.overview,
        voteCount: candidate.votes?.length ?? 0,
      } satisfies MovieClubEmailMovie;
    })
  );
  await sendMovieClubEmail(
    {
      en: 'Movie Club voting is now open',
      pt: 'A votação do Movie Club já está aberta',
    },
    {
      en: `Voting is open. Pick the film you want everyone to watch this week before ${session.closesAt.toLocaleString()}. You can open each film page to read the synopsis before voting.`,
      pt: `A votação está aberta. Escolhe o filme que queres que todos vejam esta semana antes de ${session.closesAt.toLocaleString()}. Podes abrir a página de cada filme para ler a sinopse antes de votar.`,
    },
    undefined,
    {
      actionLabel: {
        en: 'Vote in Movie Club',
        pt: 'Votar no Movie Club',
      },
      movies,
    }
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

    const endingSessions = await repository.find({
      where: {
        status: MovieClubSessionStatus.VOTING,
        closesAt: LessThanOrEqual(now),
      },
      relations: {
        candidates: { media: true, votes: true },
        votes: true,
        curators: { user: true },
      },
    });

    for (const session of endingSessions) {
      try {
        const result = await resolveMovieClubSession(session, 'en');
        logger.info(`Automatically resolved Movie Club vote ${session.id}`, {
          label: 'Seerr+',
          sessionId: session.id,
          result,
        });
      } catch (err) {
        logger.error(
          `Failed to automatically resolve Movie Club vote ${session.id}`,
          {
            label: 'Seerr+',
            sessionId: session.id,
            error: err instanceof Error ? err.message : String(err),
          }
        );
      }
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
