import TheMovieDb from '@server/api/themoviedb';
import { MediaStatus, MediaType } from '@server/constants/media';
import { getRepository } from '@server/datasource';
import Media from '@server/entity/Media';
import MovieClubCandidate from '@server/entity/MovieClubCandidate';
import MovieClubCurator from '@server/entity/MovieClubCurator';
import MovieClubSession, {
  MovieClubSessionStatus,
} from '@server/entity/MovieClubSession';
import MovieClubSuggestion from '@server/entity/MovieClubSuggestion';
import MovieClubVote from '@server/entity/MovieClubVote';
import { User } from '@server/entity/User';
import { Permission } from '@server/lib/permissions';
import type { MovieClubEmailMovie } from '@server/lib/seerrplus/movieClubNotifications';
import { sendMovieClubEmail } from '@server/lib/seerrplus/movieClubNotifications';
import { getMovieClubWeekKey } from '@server/lib/seerrplus/movieClubSuggestions';
import { getMediaRequesters } from '@server/lib/seerrplus/requests';
import { isPgsql } from '@server/utils/dbType';
import type { Request } from 'express';
import { Router } from 'express';
import { In } from 'typeorm';

const movieClubRoutes = Router();

const canManageMovieClub = (req: Request) =>
  req.user?.hasPermission(Permission.ADMIN) ?? false;

const canManageSession = (req: Request, session: MovieClubSession) =>
  canManageMovieClub(req) ||
  (session.curators ?? []).some((curator) => curator.user.id === req.user?.id);

const parsePositiveInteger = (value: unknown): number | null => {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const parseUniquePositiveIntegers = (values: unknown, limit = 100): number[] =>
  Array.isArray(values)
    ? [
        ...new Set(
          values
            .map(parsePositiveInteger)
            .filter((value): value is number => value !== null)
        ),
      ].slice(0, limit)
    : [];

const normalizeText = (value: unknown, maxLength: number) =>
  (typeof value === 'string' ? value.trim() : '').slice(0, maxLength);

const MOVIE_CLUB_THEMES = [
  {
    id: 'community',
    label: 'Community picks',
    terms: [],
  },
  {
    id: 'horror',
    label: 'Horror night',
    terms: ['horror', 'thriller', 'ghost', 'killer', 'haunted', 'monster'],
  },
  {
    id: 'action',
    label: 'Action night',
    terms: ['action', 'adventure', 'fight', 'war', 'crime', 'revenge'],
  },
  {
    id: 'comedy',
    label: 'Comedy night',
    terms: ['comedy', 'funny', 'friendship', 'family'],
  },
  {
    id: 'sci-fi',
    label: 'Sci-fi night',
    terms: ['science fiction', 'sci-fi', 'space', 'future', 'alien', 'robot'],
  },
  {
    id: 'drama',
    label: 'Drama night',
    terms: ['drama', 'romance', 'biography', 'history'],
  },
  {
    id: 'family',
    label: 'Family night',
    terms: ['animation', 'family', 'adventure', 'kids'],
  },
  {
    id: 'hidden-gems',
    label: 'Hidden gems',
    terms: ['mystery', 'independent', 'festival', 'cult'],
  },
] as const;

type MovieClubThemeId = (typeof MOVIE_CLUB_THEMES)[number]['id'];

const getMovieClubTheme = (themeId: unknown) =>
  MOVIE_CLUB_THEMES.find((theme) => theme.id === themeId) ??
  MOVIE_CLUB_THEMES[0];

const shuffle = <T>(items: T[]) =>
  [...items]
    .map((item) => ({ item, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ item }) => item);

const detailMatchesTheme = (
  details: Awaited<ReturnType<typeof movieDetails>> & {
    genres?: { name?: string }[];
  },
  themeId: MovieClubThemeId
) => {
  const theme = getMovieClubTheme(themeId);
  if (theme.id === 'community' || !theme.terms.length) {
    return true;
  }

  const searchable = [
    details.title,
    details.overview,
    ...(details.genres?.map((genre) => genre.name ?? '') ?? []),
  ]
    .join(' ')
    .toLowerCase();

  return theme.terms.some((term) => searchable.includes(term));
};

const movieDetails = async (media: Media, language?: string) => {
  const movie = await new TheMovieDb().getMovie({
    movieId: media.tmdbId,
    language,
  });
  const interestedUsers = await getMediaRequesters(media.id, false);
  return {
    mediaId: media.id,
    tmdbId: media.tmdbId,
    title: movie.title,
    releaseDate: movie.release_date,
    posterPath: movie.poster_path,
    overview: movie.overview,
    genres: movie.genres,
    interestedUsers: interestedUsers.map((user) => ({
      id: user.id,
      displayName: user.displayName,
    })),
  };
};

const requesterText = (
  movie: Awaited<ReturnType<typeof movieDetails>>,
  portuguese = false
) => {
  const names = movie.interestedUsers.map((user) => user.displayName);
  if (!names.length) {
    return portuguese
      ? 'Pedido pela comunidade Seerr+.'
      : 'Requested by the Seerr+ community.';
  }
  const requestedBy =
    names.length === 1
      ? names[0]
      : `${names.slice(0, -1).join(', ')} ${
          portuguese ? 'e' : 'and'
        } ${names[names.length - 1]}`;
  return portuguese
    ? `Pedido por ${requestedBy}.`
    : `Requested by ${requestedBy}.`;
};

const toEmailMovie = (
  movie: Awaited<ReturnType<typeof movieDetails>>,
  voteCount?: number
): MovieClubEmailMovie => ({
  title: movie.title,
  tmdbId: movie.tmdbId,
  releaseDate: movie.releaseDate,
  posterPath: movie.posterPath,
  overview: movie.overview,
  voteCount,
  requestedBy: movie.interestedUsers.map((user) => user.displayName).join(', '),
});

const hasWonMovieClub = async (mediaId: number) =>
  (await getRepository(MovieClubSession)
    .createQueryBuilder('session')
    .leftJoin('session.selectedMedia', 'selectedMedia')
    .where('selectedMedia.id = :mediaId', { mediaId })
    .getCount()) > 0;

const getWonMovieClubMediaIds = async (mediaIds: number[]) => {
  if (!mediaIds.length) {
    return new Set<number>();
  }

  const rows = await getRepository(MovieClubSession)
    .createQueryBuilder('session')
    .leftJoin('session.selectedMedia', 'selectedMedia')
    .select('selectedMedia.id', 'mediaId')
    .where('selectedMedia.id IN (:...mediaIds)', { mediaIds })
    .getRawMany<{ mediaId: number | string }>();

  return new Set(rows.map((row) => Number(row.mediaId)));
};

const sendVotingOpenEmail = async (
  session: MovieClubSession,
  language?: string
) => {
  const openedDetails = await serializeSession(session, undefined, language);
  await sendMovieClubEmail(
    {
      en: 'Movie Club voting is now open',
      pt: 'A votação do Movie Club já está aberta',
    },
    {
      en: `Voting is open. Pick the film you want everyone to watch before ${session.closesAt.toLocaleString()}. You can open each film page to read the synopsis before voting.`,
      pt: `A votação está aberta. Escolhe o filme que queres que todos vejam antes de ${session.closesAt.toLocaleString()}. Podes abrir a página de cada filme para ler a sinopse antes de votar.`,
    },
    undefined,
    {
      actionLabel: {
        en: 'Vote in Movie Club',
        pt: 'Votar no Movie Club',
      },
      movies: openedDetails.candidates.map((candidate) => ({
        title: candidate.title,
        tmdbId: candidate.tmdbId,
        releaseDate: candidate.releaseDate,
        posterPath: candidate.posterPath,
        overview: candidate.overview,
        voteCount: candidate.votes,
      })),
    }
  );
};

const getEligibleMedia = async () => {
  const weekKey = getMovieClubWeekKey();
  return getRepository(Media)
    .createQueryBuilder('media')
    .leftJoin('media.requests', 'request')
    .leftJoin(
      MovieClubSuggestion,
      'suggestion',
      'suggestion.mediaId = media.id AND suggestion.weekKey = :weekKey',
      { weekKey }
    )
    .where('media.mediaType = :mediaType', { mediaType: MediaType.MOVIE })
    .andWhere('(media.status = :available OR media.status4k = :available)', {
      available: MediaStatus.AVAILABLE,
    })
    .andWhere('(request.id IS NOT NULL OR suggestion.id IS NOT NULL)')
    .distinct(true)
    .getMany();
};

const getAvailableMovieMediaByIds = async (mediaIds: number[]) => {
  const uniqueMediaIds = [...new Set(mediaIds.filter(Number.isFinite))];
  if (!uniqueMediaIds.length) {
    return [];
  }

  return getRepository(Media)
    .createQueryBuilder('media')
    .where('media.id IN (:...mediaIds)', { mediaIds: uniqueMediaIds })
    .andWhere('media.mediaType = :mediaType', { mediaType: MediaType.MOVIE })
    .andWhere('(media.status = :available OR media.status4k = :available)', {
      available: MediaStatus.AVAILABLE,
    })
    .getMany();
};

const saveMovieClubCandidates = async (sessionId: number, media: Media[]) => {
  if (!media.length) {
    return;
  }

  const repository = getRepository(MovieClubCandidate);
  await Promise.all(
    media.map((item) =>
      repository.query(
        isPgsql
          ? 'INSERT INTO "movie_club_candidate" ("sessionId", "mediaId") VALUES ($1, $2) ON CONFLICT ("sessionId", "mediaId") DO NOTHING'
          : 'INSERT OR IGNORE INTO "movie_club_candidate" ("sessionId", "mediaId") VALUES (?, ?)',
        [sessionId, item.id]
      )
    )
  );
};

const getSuggestionStats = async (mediaIds: number[], userId?: number) => {
  if (!mediaIds.length)
    return new Map<number, { count: number; mine: boolean }>();
  const weekKey = getMovieClubWeekKey();
  const repository = getRepository(MovieClubSuggestion);
  const counts = await repository
    .createQueryBuilder('suggestion')
    .select('suggestion.mediaId', 'mediaId')
    .addSelect('COUNT(suggestion.id)', 'count')
    .where('suggestion.weekKey = :weekKey', { weekKey })
    .andWhere('suggestion.mediaId IN (:...mediaIds)', { mediaIds })
    .groupBy('suggestion.mediaId')
    .getRawMany<{ mediaId: number | string; count: number | string }>();
  const mine = userId
    ? await repository.find({
        where: {
          weekKey,
          user: { id: userId },
          media: { id: In(mediaIds) },
        },
        relations: { media: true },
      })
    : [];
  const mineIds = new Set(mine.map((suggestion) => suggestion.media.id));
  return new Map(
    mediaIds.map((mediaId) => {
      const row = counts.find((item) => Number(item.mediaId) === mediaId);
      return [
        mediaId,
        { count: Number(row?.count ?? 0), mine: mineIds.has(mediaId) },
      ];
    })
  );
};

const serializeSession = async (
  session: MovieClubSession,
  userId?: number,
  language?: string
) => {
  const candidates = await Promise.all(
    (session.candidates ?? []).map(async (candidate) => {
      const details = await movieDetails(candidate.media, language);
      const isWinner = session.selectedMedia?.id === candidate.media.id;
      return {
        id: candidate.id,
        ...details,
        interestedUserCount: details.interestedUsers.length,
        interestedUsers: isWinner ? details.interestedUsers : [],
        votes: (candidate.votes ?? []).length,
      };
    })
  );
  candidates.sort(
    (a, b) =>
      b.interestedUserCount - a.interestedUserCount ||
      a.title.localeCompare(b.title)
  );
  return {
    id: session.id,
    status: session.status,
    startsAt: session.startsAt,
    closesAt: session.closesAt,
    whatsappUrl: session.whatsappUrl,
    title: session.title,
    selectedMediaId: session.selectedMedia?.id ?? null,
    selectedAt: session.selectedAt ?? null,
    selectedCandidateId: session.selectedMedia
      ? (session.candidates?.find(
          (candidate) => candidate.media.id === session.selectedMedia?.id
        )?.id ?? null)
      : null,
    candidates,
    totalVotes: (session.votes ?? []).length,
    myVoteCandidateId:
      session.votes?.find((vote) => vote.user?.id === userId)?.candidate?.id ??
      null,
    curators: (session.curators ?? []).map((curator) => ({
      id: curator.user.id,
      displayName: curator.user.displayName,
      avatar: curator.user.avatar,
    })),
    canManage: false,
  };
};

const findCurrentSession = () =>
  getRepository(MovieClubSession).findOne({
    where: [
      { status: MovieClubSessionStatus.VOTING },
      { status: MovieClubSessionStatus.DRAFT },
      { status: MovieClubSessionStatus.SCHEDULED },
    ],
    relations: {
      candidates: { media: true, votes: true },
      votes: { user: true },
      selectedMedia: true,
      curators: { user: true },
    },
    order: { createdAt: 'DESC' },
  });

const loadMovieClubSession = (sessionId: number) =>
  getRepository(MovieClubSession).findOne({
    where: { id: sessionId },
    relations: {
      candidates: { media: true, votes: true },
      votes: { user: true },
      selectedMedia: true,
      curators: { user: true },
    },
  });

const refreshSessionState = async (
  session: MovieClubSession,
  language?: string
) => {
  const repository = getRepository(MovieClubSession);
  const now = new Date();

  if (
    session.status === MovieClubSessionStatus.SCHEDULED &&
    session.startsAt &&
    session.startsAt <= now
  ) {
    session.status = MovieClubSessionStatus.VOTING;
    await repository.save(session);
    if (!session.startNotificationSentAt) {
      await sendVotingOpenEmail(session, language);
      session.startNotificationSentAt = new Date();
      await repository.save(session);
    }
  }

  if (
    session.status !== MovieClubSessionStatus.VOTING ||
    session.closesAt > now
  ) {
    return session;
  }

  const freshSession = await repository.findOne({
    where: { id: session.id },
    relations: {
      candidates: { media: true, votes: true },
      votes: true,
      selectedMedia: true,
      curators: { user: true },
    },
  });
  if (!freshSession || freshSession.status !== MovieClubSessionStatus.VOTING) {
    return session;
  }

  const ranked = [...freshSession.candidates].sort(
    (a, b) => b.votes.length - a.votes.length
  );
  const topVotes = ranked[0]?.votes.length ?? 0;
  const leaders = ranked.filter(
    (candidate) => candidate.votes.length === topVotes
  );

  if (leaders.length === 1) {
    freshSession.status = MovieClubSessionStatus.SELECTED;
    freshSession.selectedMedia = leaders[0].media;
    freshSession.selectedAt = new Date();
    await repository.save(freshSession);
    const selectedMovie = await movieDetails(leaders[0].media, language);
    await sendMovieClubEmail(
      {
        en: `Movie Club winner: ${selectedMovie.title}`,
        pt: `Vencedor do Movie Club: ${selectedMovie.title}`,
      },
      {
        en: `The votes are in. ${selectedMovie.title} is the Film of the Week with ${topVotes} votes. ${requesterText(selectedMovie)} Watch it on Plex, read the synopsis in Seerr+, and join the Movie Club discussion.`,
        pt: `Os votos estão fechados. ${selectedMovie.title} é o Filme da Semana com ${topVotes} votos. ${requesterText(selectedMovie, true)} Vê no Plex, lê a sinopse no Seerr+ e junta-te à conversa do Movie Club.`,
      },
      undefined,
      {
        actionLabel: {
          en: 'Open Film of the Week',
          pt: 'Abrir Filme da Semana',
        },
        highlightMovie: toEmailMovie(selectedMovie, topVotes),
        movies: [toEmailMovie(selectedMovie, topVotes)],
      }
    );
    return freshSession;
  }

  const lowestVotes = Math.min(
    ...ranked.map((candidate) => candidate.votes.length)
  );
  const lowest = ranked.filter(
    (candidate) => candidate.votes.length === lowestVotes
  );
  const interestCounts = await Promise.all(
    lowest.map(async (candidate) => ({
      candidate,
      count: (await getMediaRequesters(candidate.media.id, false)).length,
    }))
  );
  interestCounts.sort(
    (a, b) => a.count - b.count || b.candidate.id - a.candidate.id
  );
  await getRepository(MovieClubCandidate).remove(interestCounts[0].candidate);
  await getRepository(MovieClubVote).delete({
    session: { id: freshSession.id },
  });
  freshSession.closesAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await repository.save(freshSession);
  const remainingMovies = await Promise.all(
    ranked
      .filter((candidate) => candidate.id !== interestCounts[0].candidate.id)
      .map((candidate) => movieDetails(candidate.media, language))
  );
  await sendMovieClubEmail(
    {
      en: 'Movie Club tie-break: voting extended',
      pt: 'Desempate do Movie Club: votação prolongada',
    },
    {
      en: 'This vote ended in a tie. Previous votes were cleared, the lowest-ranked candidate was removed, and voting is open again for another 24 hours.',
      pt: 'A votação terminou empatada. Os votos anteriores foram limpos, o candidato com menos votos foi removido e a votação está novamente aberta por mais 24 horas.',
    },
    undefined,
    {
      actionLabel: {
        en: 'Vote again in Movie Club',
        pt: 'Votar novamente no Movie Club',
      },
      movies: remainingMovies.map((movie) => toEmailMovie(movie, 0)),
    }
  );

  return freshSession;
};

movieClubRoutes.get('/', async (req, res, next) => {
  try {
    const session = await findCurrentSession();
    if (!session) return res.json({ session: null });
    const refreshedSession = await refreshSessionState(session, req.locale);
    if (
      (refreshedSession.status === MovieClubSessionStatus.DRAFT ||
        refreshedSession.status === MovieClubSessionStatus.SCHEDULED) &&
      !canManageSession(req, refreshedSession)
    ) {
      return res.json({ session: null });
    }
    const response = await serializeSession(
      refreshedSession,
      req.user?.id,
      req.locale
    );
    response.canManage = canManageSession(req, refreshedSession);
    return res.json({ session: response });
  } catch (error) {
    return next({
      status: 500,
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

movieClubRoutes.get('/eligible', async (req, res, next) => {
  try {
    const sessionId = req.query.sessionId
      ? parsePositiveInteger(req.query.sessionId)
      : null;
    if (req.query.sessionId && !sessionId) {
      return next({ status: 400, message: 'Invalid Movie Club session id.' });
    }

    const session = req.query.sessionId
      ? await getRepository(MovieClubSession).findOne({
          where: { id: sessionId ?? 0 },
          relations: { curators: { user: true }, candidates: { media: true } },
        })
      : null;
    if (
      !canManageMovieClub(req) &&
      (!session || !canManageSession(req, session))
    ) {
      return next({
        status: 403,
        message: 'Movie Club manager access required.',
      });
    }
    const media = await getEligibleMedia();
    const results = await Promise.all(
      media.map((item) => movieDetails(item, req.locale))
    );
    const suggestionStats = await getSuggestionStats(
      media.map((item) => item.id),
      req.user?.id
    );
    const ranked = results.map((item) => ({
      ...item,
      weeklySuggestions: suggestionStats.get(item.mediaId)?.count ?? 0,
      suggestedByMe: suggestionStats.get(item.mediaId)?.mine ?? false,
    }));
    ranked.sort(
      (a, b) =>
        Number(b.weeklySuggestions > 0) - Number(a.weeklySuggestions > 0) ||
        b.weeklySuggestions - a.weeklySuggestions ||
        b.interestedUsers.length - a.interestedUsers.length ||
        a.title.localeCompare(b.title)
    );
    const selectedMediaIds = new Set(
      session?.candidates.map((candidate) => candidate.media.id) ?? []
    );
    const selected = ranked.filter((item) =>
      selectedMediaIds.has(item.mediaId)
    );
    const top = [
      ...selected,
      ...ranked.filter((item) => !selectedMediaIds.has(item.mediaId)),
    ].slice(0, 10);
    return res.json({
      results: await Promise.all(
        top.map(async (item) => ({
          ...item,
          interestedUserCount: item.interestedUsers.length,
          interestedUsers: [],
          hasWonMovieClub: await hasWonMovieClub(item.mediaId),
        }))
      ),
      weekKey: getMovieClubWeekKey(),
    });
  } catch (error) {
    return next({
      status: 500,
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

movieClubRoutes.get('/random', async (req, res, next) => {
  try {
    const sessionId = req.query.sessionId
      ? parsePositiveInteger(req.query.sessionId)
      : null;
    if (req.query.sessionId && !sessionId) {
      return next({ status: 400, message: 'Invalid Movie Club session id.' });
    }

    const session = req.query.sessionId
      ? await getRepository(MovieClubSession).findOne({
          where: { id: sessionId ?? 0 },
          relations: { curators: { user: true } },
        })
      : null;
    if (
      !canManageMovieClub(req) &&
      (!session || !canManageSession(req, session))
    ) {
      return next({
        status: 403,
        message: 'Movie Club manager access required.',
      });
    }

    const theme = getMovieClubTheme(req.query.theme);
    const media = await getEligibleMedia();
    const suggestionStats = await getSuggestionStats(
      media.map((item) => item.id),
      req.user?.id
    );
    const details = await Promise.all(
      media.map(async (item) => {
        const itemDetails = await movieDetails(item, req.locale);
        const stats = suggestionStats.get(item.id);
        return {
          ...itemDetails,
          weeklySuggestions: stats?.count ?? 0,
          suggestedByMe: stats?.mine ?? false,
          interestedUserCount: itemDetails.interestedUsers.length,
          interestedUsers: [],
          randomScore:
            (stats?.count ?? 0) * 3 + itemDetails.interestedUsers.length,
        };
      })
    );

    const byTheme = details.filter((item) =>
      detailMatchesTheme(item, theme.id)
    );
    const rankedPool = (items: typeof details) =>
      shuffle(items)
        .sort((a, b) => b.randomScore - a.randomScore)
        .slice(0, 12);
    const selected = shuffle(rankedPool(byTheme)).slice(0, 4);
    const selectedIds = new Set(selected.map((item) => item.mediaId));
    const fallback = shuffle(
      rankedPool(details.filter((item) => !selectedIds.has(item.mediaId)))
    ).slice(0, Math.max(0, 4 - selected.length));
    const results = [...selected, ...fallback].slice(0, 4);
    const winnerMediaIds = await getWonMovieClubMediaIds(
      results.map((item) => item.mediaId)
    );

    return res.json({
      theme,
      themes: MOVIE_CLUB_THEMES,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      results: results.map(({ randomScore: _randomScore, ...item }) => ({
        ...item,
        hasWonMovieClub: winnerMediaIds.has(item.mediaId),
      })),
    });
  } catch (error) {
    return next({
      status: 500,
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

movieClubRoutes.get('/search', async (req, res, next) => {
  try {
    const session = req.query.sessionId
      ? await getRepository(MovieClubSession).findOne({
          where: { id: parsePositiveInteger(req.query.sessionId) ?? 0 },
          relations: { curators: { user: true } },
        })
      : null;
    if (
      !canManageMovieClub(req) &&
      (!session || !canManageSession(req, session))
    ) {
      return next({
        status: 403,
        message: 'Movie Club manager access required.',
      });
    }
    const query = normalizeText(req.query.query, 100);
    if (query.length < 2) {
      return res.json({ results: [] });
    }

    const tmdbResults = await new TheMovieDb().searchMovies({
      query,
      page: 1,
      language: req.locale,
    });
    const tmdbIds = [
      ...new Set(tmdbResults.results.map((result) => result.id)),
    ].slice(0, 20);
    if (!tmdbIds.length) {
      return res.json({ results: [] });
    }

    const media = await getRepository(Media).find({
      where: {
        tmdbId: In(tmdbIds),
        mediaType: MediaType.MOVIE,
      },
    });
    const available = media.filter(
      (item) =>
        item.status === MediaStatus.AVAILABLE ||
        item.status4k === MediaStatus.AVAILABLE
    );
    const mediaByTmdbId = new Map(available.map((item) => [item.tmdbId, item]));
    const resultMedia = tmdbResults.results
      .map((result) => mediaByTmdbId.get(result.id))
      .filter((item): item is Media => Boolean(item))
      .slice(0, 10);
    const winnerMediaIds = await getWonMovieClubMediaIds(
      resultMedia.map((item) => item.id)
    );
    const results = await Promise.all(
      resultMedia.map(async (item) => {
        const details = await movieDetails(item, req.locale);
        return {
          ...details,
          interestedUserCount: details.interestedUsers.length,
          interestedUsers: [],
          weeklySuggestions: 0,
          suggestedByMe: false,
          hasWonMovieClub: winnerMediaIds.has(item.id),
        };
      })
    );

    return res.json({ results });
  } catch (error) {
    return next({
      status: 500,
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

movieClubRoutes.get('/users', async (req, res, next) => {
  try {
    if (!canManageMovieClub(req))
      return next({ status: 403, message: 'Administrator access required.' });
    const users = await getRepository(User).find();
    users.sort((a, b) => a.displayName.localeCompare(b.displayName));
    return res.json({
      results: users.map((user) => ({
        id: user.id,
        displayName: user.displayName,
        avatar: user.avatar,
      })),
    });
  } catch (error) {
    return next({
      status: 500,
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

movieClubRoutes.get('/history', async (req, res, next) => {
  try {
    const sessions = await getRepository(MovieClubSession)
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.selectedMedia', 'selectedMedia')
      .leftJoinAndSelect('session.candidates', 'candidate')
      .leftJoinAndSelect('candidate.media', 'candidateMedia')
      .leftJoinAndSelect('candidate.votes', 'candidateVote')
      .leftJoinAndSelect('session.votes', 'vote')
      .leftJoinAndSelect('vote.user', 'voteUser')
      .leftJoinAndSelect('vote.candidate', 'voteCandidate')
      .leftJoinAndSelect('session.curators', 'curator')
      .leftJoinAndSelect('curator.user', 'curatorUser')
      .where('selectedMedia.id IS NOT NULL')
      .orderBy('session.selectedAt', 'DESC')
      .addOrderBy('session.createdAt', 'DESC')
      .take(12)
      .getMany();
    return res.json({
      results: await Promise.all(
        sessions.map((session) =>
          serializeSession(session, req.user?.id, req.locale)
        )
      ),
    });
  } catch (error) {
    return next({
      status: 500,
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

movieClubRoutes.get('/winners/:mediaId', async (req, res, next) => {
  try {
    const mediaId = parsePositiveInteger(req.params.mediaId);
    if (!mediaId) {
      return next({ status: 400, message: 'Invalid media id.' });
    }

    const repository = getRepository(MovieClubSession);
    const count = await repository
      .createQueryBuilder('session')
      .leftJoin('session.selectedMedia', 'selectedMedia')
      .where('selectedMedia.id = :mediaId', { mediaId })
      .getCount();
    const latest = count
      ? await repository
          .createQueryBuilder('session')
          .leftJoin('session.selectedMedia', 'selectedMedia')
          .where('selectedMedia.id = :mediaId', { mediaId })
          .orderBy('session.selectedAt', 'DESC')
          .addOrderBy('session.createdAt', 'DESC')
          .getOne()
      : null;

    return res.json({
      winner: count > 0,
      count,
      lastWonAt: latest?.selectedAt ?? latest?.createdAt ?? null,
      sessionId: latest?.id ?? null,
    });
  } catch (error) {
    return next({
      status: 500,
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

movieClubRoutes.get('/suggestions/:mediaId', async (req, res, next) => {
  try {
    if (!req.user)
      return next({ status: 401, message: 'Authentication required.' });
    const mediaId = parsePositiveInteger(req.params.mediaId);
    if (!mediaId) return next({ status: 400, message: 'Invalid media id.' });
    const weekKey = getMovieClubWeekKey();
    const repository = getRepository(MovieClubSuggestion);
    const [suggestion, count] = await Promise.all([
      repository.findOne({
        where: {
          weekKey,
          media: { id: mediaId },
          user: { id: req.user.id },
        },
      }),
      repository.count({ where: { weekKey, media: { id: mediaId } } }),
    ]);
    return res.json({ suggested: Boolean(suggestion), count, weekKey });
  } catch (error) {
    return next({
      status: 500,
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

movieClubRoutes.post('/suggestions/:mediaId', async (req, res, next) => {
  try {
    if (!req.user)
      return next({ status: 401, message: 'Authentication required.' });
    const mediaId = parsePositiveInteger(req.params.mediaId);
    if (!mediaId) return next({ status: 400, message: 'Invalid media id.' });
    const media = await getRepository(Media).findOne({
      where: { id: mediaId },
    });
    if (!media || media.mediaType !== MediaType.MOVIE) {
      return next({ status: 404, message: 'Movie not found.' });
    }
    if (
      media.status !== MediaStatus.AVAILABLE &&
      media.status4k !== MediaStatus.AVAILABLE
    ) {
      return next({
        status: 409,
        message: 'Only movies available in Plex can be suggested.',
      });
    }
    const repository = getRepository(MovieClubSuggestion);
    const weekKey = getMovieClubWeekKey();
    const existing = await repository.findOne({
      where: {
        weekKey,
        media: { id: media.id },
        user: { id: req.user.id },
      },
    });
    if (!existing) {
      await repository.save(
        new MovieClubSuggestion({ weekKey, media, user: req.user })
      );
    }
    const count = await repository.count({
      where: { weekKey, media: { id: media.id } },
    });
    return res.json({ suggested: true, count, weekKey });
  } catch (error) {
    return next({
      status: 500,
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

movieClubRoutes.delete('/suggestions/:mediaId', async (req, res, next) => {
  try {
    if (!req.user)
      return next({ status: 401, message: 'Authentication required.' });
    const mediaId = parsePositiveInteger(req.params.mediaId);
    if (!mediaId) return next({ status: 400, message: 'Invalid media id.' });
    const repository = getRepository(MovieClubSuggestion);
    const weekKey = getMovieClubWeekKey();
    const suggestion = await repository.findOne({
      where: {
        weekKey,
        media: { id: mediaId },
        user: { id: req.user.id },
      },
    });
    if (suggestion) await repository.remove(suggestion);
    const count = await repository.count({
      where: {
        weekKey,
        media: { id: mediaId },
      },
    });
    return res.json({ suggested: false, count, weekKey });
  } catch (error) {
    return next({
      status: 500,
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

movieClubRoutes.post('/sessions', async (req, res, next) => {
  try {
    if (!req.user || !canManageMovieClub(req))
      return next({ status: 403, message: 'Administrator access required.' });
    const mediaIds = parseUniquePositiveIntegers(req.body?.mediaIds, 4);
    const curatorIds = parseUniquePositiveIntegers(
      req.body?.curatorUserIds,
      25
    );
    const closesAt = new Date(req.body?.closesAt);
    const startsAt = req.body?.startsAt ? new Date(req.body.startsAt) : null;
    const saveDraft = req.body?.draft === true;
    const validCandidateCount = mediaIds.length >= 2 && mediaIds.length <= 4;
    const validDelegatedDraft = mediaIds.length === 0 && curatorIds.length > 0;
    const validDraft = saveDraft && mediaIds.length <= 4;
    if (
      (!validCandidateCount && !validDelegatedDraft && !validDraft) ||
      Number.isNaN(closesAt.getTime()) ||
      closesAt <= new Date()
    )
      return next({
        status: 400,
        message:
          'Select between two and four candidates, save a draft, or assign a responsible user, and choose a future closing date.',
      });
    if (
      startsAt &&
      (Number.isNaN(startsAt.getTime()) ||
        startsAt <= new Date() ||
        startsAt >= closesAt)
    ) {
      return next({
        status: 400,
        message:
          'The scheduled start must be in the future and before the voting deadline.',
      });
    }
    if (await findCurrentSession())
      return next({
        status: 409,
        message: 'A Movie Club session is already active.',
      });
    const selected = await getAvailableMovieMediaByIds(mediaIds);
    if (selected.length !== new Set(mediaIds).size)
      return next({
        status: 400,
        message: 'Candidates must be movies available in Plex.',
      });
    const curators = curatorIds.length
      ? await getRepository(User).find({ where: { id: In(curatorIds) } })
      : [];
    if (curators.length !== curatorIds.length) {
      return next({
        status: 400,
        message: 'One or more responsible users were not found.',
      });
    }
    const session = await getRepository(MovieClubSession).save(
      new MovieClubSession({
        status:
          saveDraft || !mediaIds.length
            ? MovieClubSessionStatus.DRAFT
            : startsAt
              ? MovieClubSessionStatus.SCHEDULED
              : MovieClubSessionStatus.VOTING,
        startsAt: saveDraft ? null : startsAt,
        closesAt,
        whatsappUrl: normalizeText(req.body?.whatsappUrl, 500) || null,
        title: normalizeText(req.body?.title, 120) || null,
        createdBy: req.user,
      })
    );
    if (selected.length) {
      await saveMovieClubCandidates(session.id, selected);
    }
    if (curatorIds.length) {
      await getRepository(MovieClubCurator).save(
        curators.map((user) => new MovieClubCurator({ session, user }))
      );
      await sendMovieClubEmail(
        {
          en: "Movie Club: you are choosing this week's films",
          pt: 'Movie Club: vais escolher os filmes desta semana',
        },
        {
          en: `You have been selected as a Movie Club responsible user. Open Seerr+, review the community list, and choose exactly four films before ${startsAt?.toLocaleString() ?? closesAt.toLocaleString()}.`,
          pt: `Foste selecionado como responsável do Movie Club. Abre o Seerr+, revê a lista da comunidade e escolhe exatamente quatro filmes antes de ${startsAt?.toLocaleString() ?? closesAt.toLocaleString()}.`,
        },
        curators,
        {
          actionLabel: {
            en: 'Choose the Movie Club films',
            pt: 'Escolher os filmes do Movie Club',
          },
        }
      );
    }
    const created = await loadMovieClubSession(session.id);
    if (!created) {
      return next({
        status: 500,
        message: 'Movie Club session was not created correctly.',
      });
    }
    const createdDetails = await serializeSession(
      created,
      req.user.id,
      req.locale
    );
    if (session.status === MovieClubSessionStatus.VOTING) {
      await sendMovieClubEmail(
        {
          en: 'Movie Club voting is now open',
          pt: 'A votação do Movie Club já está aberta',
        },
        {
          en: `Voting is open. Pick the film you want everyone to watch this week before ${closesAt.toLocaleString()}. You can open each film page to read the synopsis before voting.`,
          pt: `A votação está aberta. Escolhe o filme que queres que todos vejam esta semana antes de ${closesAt.toLocaleString()}. Podes abrir a página de cada filme para ler a sinopse antes de votar.`,
        },
        undefined,
        {
          actionLabel: {
            en: 'Vote in Movie Club',
            pt: 'Votar no Movie Club',
          },
          movies: createdDetails.candidates.map((candidate) => ({
            title: candidate.title,
            tmdbId: candidate.tmdbId,
            releaseDate: candidate.releaseDate,
            posterPath: candidate.posterPath,
            overview: candidate.overview,
            voteCount: candidate.votes,
          })),
        }
      );
    }
    return res.status(201).json({ session: createdDetails });
  } catch (error) {
    return next({
      status: 500,
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

movieClubRoutes.post('/sessions/:sessionId/vote', async (req, res, next) => {
  try {
    if (!req.user)
      return next({ status: 401, message: 'Authentication required.' });
    const sessionId = parsePositiveInteger(req.params.sessionId);
    const candidateId = parsePositiveInteger(req.body?.candidateId);
    if (!sessionId || !candidateId)
      return next({ status: 400, message: 'Invalid vote.' });
    const session = await getRepository(MovieClubSession).findOne({
      where: { id: sessionId },
    });
    const candidate = await getRepository(MovieClubCandidate).findOne({
      where: { id: candidateId, session: { id: sessionId } },
    });
    if (!session || !candidate)
      return next({
        status: 404,
        message: 'Movie Club session or candidate not found.',
      });
    if (
      session.status !== MovieClubSessionStatus.VOTING ||
      session.closesAt <= new Date()
    )
      return next({ status: 409, message: 'Voting is closed.' });
    const votes = getRepository(MovieClubVote);
    const vote = await votes.findOne({
      where: { session: { id: session.id }, user: { id: req.user.id } },
    });
    await votes.save(
      vote
        ? Object.assign(vote, { candidate })
        : new MovieClubVote({ session, candidate, user: req.user })
    );
    return res.status(204).send();
  } catch (error) {
    return next({
      status: 500,
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

movieClubRoutes.post('/sessions/:sessionId/select', async (req, res, next) => {
  try {
    if (!canManageMovieClub(req))
      return next({ status: 403, message: 'Administrator access required.' });
    const sessionId = parsePositiveInteger(req.params.sessionId);
    const candidateId = parsePositiveInteger(req.body?.candidateId);
    if (!sessionId || !candidateId)
      return next({ status: 400, message: 'Invalid Movie Club selection.' });
    const session = await getRepository(MovieClubSession).findOne({
      where: { id: sessionId },
    });
    const candidate = await getRepository(MovieClubCandidate).findOne({
      where: { id: candidateId, session: { id: sessionId } },
      relations: { media: true },
    });
    if (!session || !candidate)
      return next({
        status: 404,
        message: 'Movie Club session or candidate not found.',
      });
    session.status = MovieClubSessionStatus.SELECTED;
    session.selectedMedia = candidate.media;
    session.selectedAt = new Date();
    await getRepository(MovieClubSession).save(session);
    const selectedMovie = await movieDetails(candidate.media, req.locale);
    await sendMovieClubEmail(
      {
        en: `Movie Club winner: ${selectedMovie.title}`,
        pt: `Vencedor do Movie Club: ${selectedMovie.title}`,
      },
      {
        en: `The votes are in. ${selectedMovie.title} is the Film of the Week. ${requesterText(selectedMovie)} Watch it on Plex, read the synopsis in Seerr+, and join the Movie Club discussion.`,
        pt: `Os votos estão fechados. ${selectedMovie.title} é o Filme da Semana. ${requesterText(selectedMovie, true)} Vê no Plex, lê a sinopse no Seerr+ e junta-te à conversa do Movie Club.`,
      },
      undefined,
      {
        actionLabel: {
          en: 'Open Film of the Week',
          pt: 'Abrir Filme da Semana',
        },
        highlightMovie: toEmailMovie(selectedMovie),
        movies: [toEmailMovie(selectedMovie)],
      }
    );
    return res.status(204).send();
  } catch (error) {
    return next({
      status: 500,
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

movieClubRoutes.patch('/sessions/:sessionId', async (req, res, next) => {
  try {
    const repository = getRepository(MovieClubSession);
    const sessionId = parsePositiveInteger(req.params.sessionId);
    if (!sessionId) {
      return next({ status: 400, message: 'Invalid Movie Club session id.' });
    }

    const session = await repository.findOne({
      where: { id: sessionId },
      relations: { candidates: { media: true }, curators: { user: true } },
    });
    if (!session)
      return next({ status: 404, message: 'Movie Club session not found.' });
    if (!canManageSession(req, session)) {
      return next({ status: 403, message: 'Administrator access required.' });
    }

    if (req.body?.closesAt && !canManageMovieClub(req)) {
      return next({
        status: 403,
        message: 'Only an administrator can change the voting deadline.',
      });
    }
    if (
      Object.prototype.hasOwnProperty.call(req.body, 'startsAt') &&
      !canManageMovieClub(req)
    ) {
      return next({
        status: 403,
        message: 'Only an administrator can change the scheduled start.',
      });
    }
    const wasScheduled = session.status === MovieClubSessionStatus.SCHEDULED;
    const saveDraft = req.body?.draft === true;
    if (Object.prototype.hasOwnProperty.call(req.body, 'startsAt')) {
      if (
        session.status !== MovieClubSessionStatus.DRAFT &&
        session.status !== MovieClubSessionStatus.SCHEDULED
      ) {
        return next({
          status: 409,
          message: 'Only a draft or scheduled vote can change its start time.',
        });
      }
      const startsAt = req.body.startsAt ? new Date(req.body.startsAt) : null;
      if (
        startsAt &&
        (Number.isNaN(startsAt.getTime()) || startsAt <= new Date())
      ) {
        return next({
          status: 400,
          message: 'The scheduled start must be in the future.',
        });
      }
      session.startsAt = startsAt;
      session.startNotificationSentAt = null;
    }
    if (req.body?.closesAt) {
      const closesAt = new Date(req.body.closesAt);
      if (Number.isNaN(closesAt.getTime()) || closesAt <= new Date()) {
        return next({ status: 400, message: 'Invalid voting closing date.' });
      }
      session.closesAt = closesAt;
    }
    if (session.startsAt && session.startsAt >= session.closesAt) {
      return next({
        status: 400,
        message: 'The scheduled start must be before the voting deadline.',
      });
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'whatsappUrl')) {
      session.whatsappUrl = normalizeText(req.body.whatsappUrl, 500) || null;
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'title')) {
      session.title = normalizeText(req.body.title, 120) || null;
    }

    if (Array.isArray(req.body?.mediaIds)) {
      const mediaIds = parseUniquePositiveIntegers(req.body.mediaIds, 4);
      if (
        session.status === MovieClubSessionStatus.DRAFT &&
        session.closesAt <= new Date()
      ) {
        return next({
          status: 409,
          message:
            'The administrator must choose a new voting deadline before the vote can open.',
        });
      }
      if (
        !saveDraft &&
        (((session.status === MovieClubSessionStatus.DRAFT ||
          session.status === MovieClubSessionStatus.SCHEDULED) &&
          mediaIds.length !== 4) ||
          (session.status !== MovieClubSessionStatus.DRAFT &&
            session.status !== MovieClubSessionStatus.SCHEDULED &&
            (mediaIds.length < 2 || mediaIds.length > 4)))
      ) {
        return next({
          status: 400,
          message:
            session.status === MovieClubSessionStatus.DRAFT ||
            session.status === MovieClubSessionStatus.SCHEDULED
              ? 'Select exactly four candidates to prepare the vote.'
              : 'Select between two and four candidates.',
        });
      }
      if (saveDraft && mediaIds.length > 4) {
        return next({
          status: 400,
          message: 'A draft can include up to four candidates.',
        });
      }
      const selected = await getAvailableMovieMediaByIds(mediaIds);
      if (selected.length !== mediaIds.length) {
        return next({
          status: 400,
          message: 'Candidates must be movies available in Plex.',
        });
      }
      const candidateRepository = getRepository(MovieClubCandidate);
      const retainedIds = session.candidates
        .filter((candidate) => mediaIds.includes(candidate.media.id))
        .map((candidate) => candidate.media.id);
      const removed = session.candidates.filter(
        (candidate) => !mediaIds.includes(candidate.media.id)
      );
      if (removed.length) await candidateRepository.remove(removed);
      const added = selected.filter((media) => !retainedIds.includes(media.id));
      if (added.length) {
        await saveMovieClubCandidates(session.id, added);
      }
    }

    if (canManageMovieClub(req) && Array.isArray(req.body?.curatorUserIds)) {
      const curatorRepository = getRepository(MovieClubCurator);
      const previousCuratorIds = session.curators.map(
        (curator) => curator.user.id
      );
      const curatorIds = parseUniquePositiveIntegers(
        req.body.curatorUserIds,
        25
      );
      const users = curatorIds.length
        ? await getRepository(User).find({ where: { id: In(curatorIds) } })
        : [];
      if (users.length !== curatorIds.length) {
        return next({
          status: 400,
          message: 'One or more responsible users were not found.',
        });
      }
      const removedCurators = session.curators.filter(
        (curator) => !curatorIds.includes(curator.user.id)
      );
      if (removedCurators.length) {
        await curatorRepository.remove(removedCurators);
      }
      const newlyAssigned = users.filter(
        (user) => !previousCuratorIds.includes(user.id)
      );
      if (newlyAssigned.length) {
        for (const user of newlyAssigned) {
          await curatorRepository.query(
            isPgsql
              ? 'INSERT INTO "movie_club_curator" ("sessionId", "userId") VALUES ($1, $2) ON CONFLICT ("sessionId", "userId") DO NOTHING'
              : 'INSERT OR IGNORE INTO "movie_club_curator" ("sessionId", "userId") VALUES (?, ?)',
            [session.id, user.id]
          );
        }
        await sendMovieClubEmail(
          {
            en: "Movie Club: you are choosing this week's films",
            pt: 'Movie Club: vais escolher os filmes desta semana',
          },
          {
            en: `You have been selected as a Movie Club responsible user. Open Seerr+ and choose exactly four films from the community requests before ${session.closesAt.toLocaleString()}.`,
            pt: `Foste selecionado como responsável do Movie Club. Abre o Seerr+ e escolhe exatamente quatro filmes da lista da comunidade antes de ${session.closesAt.toLocaleString()}.`,
          },
          newlyAssigned,
          {
            actionLabel: {
              en: 'Choose the Movie Club films',
              pt: 'Escolher os filmes do Movie Club',
            },
          }
        );
      }
    }

    const preparedFromDraft =
      session.status === MovieClubSessionStatus.DRAFT &&
      Array.isArray(req.body?.mediaIds) &&
      !saveDraft;
    const startImmediately =
      !session.startsAt || session.startsAt <= new Date();
    if (saveDraft) {
      session.status = MovieClubSessionStatus.DRAFT;
      session.startsAt = null;
      session.startNotificationSentAt = null;
    } else if (preparedFromDraft) {
      session.status = startImmediately
        ? MovieClubSessionStatus.VOTING
        : MovieClubSessionStatus.SCHEDULED;
    } else if (wasScheduled && startImmediately) {
      session.status = MovieClubSessionStatus.VOTING;
    }
    await repository.save(session);
    const updated = await loadMovieClubSession(session.id);
    if (!updated) {
      return next({
        status: 500,
        message: 'Movie Club session was not updated correctly.',
      });
    }
    if (
      (preparedFromDraft && startImmediately) ||
      (wasScheduled && startImmediately)
    ) {
      const openedDetails = await serializeSession(
        updated,
        req.user?.id,
        req.locale
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
          movies: openedDetails.candidates.map((candidate) => ({
            title: candidate.title,
            tmdbId: candidate.tmdbId,
            releaseDate: candidate.releaseDate,
            posterPath: candidate.posterPath,
            overview: candidate.overview,
            voteCount: candidate.votes,
          })),
        }
      );
      session.startNotificationSentAt = new Date();
      await repository.save(session);
    }
    return res.json({
      session: await serializeSession(updated, req.user?.id, req.locale),
    });
  } catch (error) {
    return next({
      status: 500,
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

export const resolveMovieClubSession = async (
  session: MovieClubSession,
  locale = 'en'
) => {
  const repository = getRepository(MovieClubSession);
  const ranked = [...session.candidates].sort(
    (a, b) => b.votes.length - a.votes.length
  );
  const topVotes = ranked[0]?.votes.length ?? 0;
  const leaders = ranked.filter(
    (candidate) => candidate.votes.length === topVotes
  );
  if (leaders.length === 1) {
    session.status = MovieClubSessionStatus.SELECTED;
    session.selectedMedia = leaders[0].media;
    session.selectedAt = new Date();
    await repository.save(session);
    const selectedMovie = await movieDetails(leaders[0].media, locale);
    await sendMovieClubEmail(
      {
        en: `Movie Club winner: ${selectedMovie.title}`,
        pt: `Vencedor do Movie Club: ${selectedMovie.title}`,
      },
      {
        en: `The votes are in. ${selectedMovie.title} is the Film of the Week with ${topVotes} votes. ${requesterText(selectedMovie)} Watch it on Plex, read the synopsis in Seerr+, and join the Movie Club discussion.`,
        pt: `Os votos estão fechados. ${selectedMovie.title} é o Filme da Semana com ${topVotes} votos. ${requesterText(selectedMovie, true)} Vê no Plex, lê a sinopse no Seerr+ e junta-te à conversa do Movie Club.`,
      },
      undefined,
      {
        actionLabel: {
          en: 'Open Film of the Week',
          pt: 'Abrir Filme da Semana',
        },
        highlightMovie: toEmailMovie(selectedMovie, topVotes),
        movies: [toEmailMovie(selectedMovie, topVotes)],
      }
    );
    return { tie: false, winner: selectedMovie };
  }
  const lowestVotes = Math.min(
    ...ranked.map((candidate) => candidate.votes.length)
  );
  const lowest = ranked.filter(
    (candidate) => candidate.votes.length === lowestVotes
  );
  const interestCounts = await Promise.all(
    lowest.map(async (candidate) => ({
      candidate,
      count: (await getMediaRequesters(candidate.media.id, false)).length,
    }))
  );
  interestCounts.sort(
    (a, b) => a.count - b.count || b.candidate.id - a.candidate.id
  );
  await getRepository(MovieClubCandidate).remove(interestCounts[0].candidate);
  await getRepository(MovieClubVote).delete({ session: { id: session.id } });
  session.closesAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await repository.save(session);
  const remainingMovies = await Promise.all(
    ranked
      .filter((candidate) => candidate.id !== interestCounts[0].candidate.id)
      .map((candidate) => movieDetails(candidate.media, locale))
  );
  await sendMovieClubEmail(
    {
      en: 'Movie Club tie-break: voting extended',
      pt: 'Desempate do Movie Club: votação prolongada',
    },
    {
      en: "This week's vote ended in a tie. The previous votes have been cleared, the lowest-ranked candidate has been removed, and voting is open again for another 24 hours. Open the remaining film pages to read the synopses and cast your new vote.",
      pt: 'A votação desta semana terminou empatada. Os votos anteriores foram limpos, o candidato com menos votos foi removido e a votação está novamente aberta por mais 24 horas. Abre as páginas dos filmes restantes, lê as sinopses e vota novamente.',
    },
    undefined,
    {
      actionLabel: {
        en: 'Vote again in Movie Club',
        pt: 'Votar novamente no Movie Club',
      },
      movies: remainingMovies.map((movie) => toEmailMovie(movie, 0)),
    }
  );
  return { tie: true, closesAt: session.closesAt };
};

movieClubRoutes.post('/sessions/:sessionId/resolve', async (req, res, next) => {
  try {
    const repository = getRepository(MovieClubSession);
    const sessionId = parsePositiveInteger(req.params.sessionId);
    if (!sessionId) {
      return next({ status: 400, message: 'Invalid Movie Club session id.' });
    }

    const session = await repository.findOne({
      where: { id: sessionId },
      relations: {
        candidates: { media: true, votes: true },
        votes: true,
        curators: { user: true },
      },
    });
    if (!session)
      return next({ status: 404, message: 'Movie Club session not found.' });
    if (!canManageSession(req, session))
      return next({
        status: 403,
        message: 'Movie Club manager access required.',
      });
    if (session.status !== MovieClubSessionStatus.VOTING)
      return next({ status: 409, message: 'Voting is not active.' });
    if (session.closesAt > new Date())
      return next({ status: 409, message: 'Voting is still open.' });

    const result = await resolveMovieClubSession(session, req.locale);
    return res.json(result);
  } catch (error) {
    return next({
      status: 500,
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

movieClubRoutes.post('/sessions/:sessionId/close', async (req, res, next) => {
  try {
    if (!canManageMovieClub(req))
      return next({ status: 403, message: 'Administrator access required.' });
    const repository = getRepository(MovieClubSession);
    const sessionId = parsePositiveInteger(req.params.sessionId);
    if (!sessionId) {
      return next({ status: 400, message: 'Invalid Movie Club session id.' });
    }
    const session = await repository.findOne({ where: { id: sessionId } });
    if (!session)
      return next({ status: 404, message: 'Movie Club session not found.' });
    session.status = MovieClubSessionStatus.CLOSED;
    await repository.save(session);
    return res.status(204).send();
  } catch (error) {
    return next({
      status: 500,
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

movieClubRoutes.delete('/sessions/:sessionId', async (req, res, next) => {
  try {
    if (!canManageMovieClub(req))
      return next({ status: 403, message: 'Administrator access required.' });
    const sessionId = parsePositiveInteger(req.params.sessionId);
    if (!sessionId) {
      return next({ status: 400, message: 'Invalid Movie Club session id.' });
    }
    const result = await getRepository(MovieClubSession).delete(sessionId);
    if (!result.affected)
      return next({ status: 404, message: 'Movie Club session not found.' });
    return res.status(204).send();
  } catch (error) {
    return next({
      status: 500,
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

export default movieClubRoutes;
