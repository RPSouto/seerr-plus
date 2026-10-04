import TheMovieDb from '@server/api/themoviedb';
import { MediaStatus, MediaType } from '@server/constants/media';
import { getRepository, isPgsql } from '@server/datasource';
import Media from '@server/entity/Media';
import MovieFightEntry from '@server/entity/MovieFightEntry';
import MovieFightMatch, {
  MovieFightMatchStatus,
} from '@server/entity/MovieFightMatch';
import MovieFightTournament, {
  MovieFightTournamentStatus,
} from '@server/entity/MovieFightTournament';
import MovieFightVote from '@server/entity/MovieFightVote';
import { Permission } from '@server/lib/permissions';
import { sendMovieFightNotification } from '@server/lib/seerrplus/movieFightNotifications';
import { syncMediaToPlexWinnerCollection } from '@server/lib/seerrplus/plexWinnerCollections';
import type { Request } from 'express';
import { Router } from 'express';
import { In } from 'typeorm';

const movieFightRoutes = Router();

const MOVIE_FIGHT_THEMES = [
  {
    id: 'community',
    label: 'Community picks',
    terms: [],
  },
  {
    id: 'horror',
    label: 'Horror fight',
    terms: ['horror', 'thriller', 'ghost', 'killer', 'haunted', 'monster'],
  },
  {
    id: 'action',
    label: 'Action fight',
    terms: ['action', 'adventure', 'fight', 'war', 'crime', 'revenge'],
  },
  {
    id: 'comedy',
    label: 'Comedy fight',
    terms: ['comedy', 'funny', 'friendship', 'family'],
  },
  {
    id: 'sci-fi',
    label: 'Sci-fi fight',
    terms: ['science fiction', 'sci-fi', 'space', 'future', 'alien', 'robot'],
  },
  {
    id: 'drama',
    label: 'Drama fight',
    terms: ['drama', 'romance', 'biography', 'history'],
  },
  {
    id: 'family',
    label: 'Family fight',
    terms: ['animation', 'family', 'adventure', 'kids'],
  },
  {
    id: 'hidden-gems',
    label: 'Hidden gems',
    terms: ['mystery', 'independent', 'festival', 'cult'],
  },
  {
    id: 'classics',
    label: 'Classics',
    terms: ['classic', 'cult', 'noir', 'western', 'crime', 'drama'],
  },
] as const;

type MovieFightThemeId = (typeof MOVIE_FIGHT_THEMES)[number]['id'];

const canManageMovieFight = (req: Request) =>
  req.user?.hasPermission(Permission.ADMIN) ?? false;

const parsePositiveInteger = (value: unknown): number | null => {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const parseUniquePositiveIntegers = (values: unknown, limit = 16): number[] =>
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

const getMovieFightTheme = (themeId: unknown) =>
  MOVIE_FIGHT_THEMES.find((theme) => theme.id === themeId) ??
  MOVIE_FIGHT_THEMES[0];

const shuffle = <T>(items: T[]) =>
  [...items]
    .map((item) => ({ item, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ item }) => item);

const addHours = (date: Date, hours: number) =>
  new Date(date.getTime() + hours * 60 * 60 * 1000);

const getRoundMatchCount = (firstRoundMatchCount: number, round: number) =>
  Math.max(1, Math.ceil(firstRoundMatchCount / 2 ** (round - 1)));

const getFirstMatchNumberForRound = (
  firstRoundMatchCount: number,
  round: number
) =>
  Array.from({ length: Math.max(0, round - 1) }, (_item, index) =>
    getRoundMatchCount(firstRoundMatchCount, index + 1)
  ).reduce((total, count) => total + count, 1);

const movieDetails = async (media: Media, language?: string) => {
  const movie = await new TheMovieDb().getMovie({
    movieId: media.tmdbId,
    language,
  });

  return {
    mediaId: media.id,
    tmdbId: media.tmdbId,
    title: movie.title,
    releaseDate: movie.release_date,
    posterPath: movie.poster_path,
    backdropPath: movie.backdrop_path,
    overview: movie.overview,
    genres: movie.genres,
    voteAverage: movie.vote_average,
  };
};

const detailMatchesTheme = (
  details: Awaited<ReturnType<typeof movieDetails>>,
  themeId: MovieFightThemeId
) => {
  const theme = getMovieFightTheme(themeId);
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

const getEligibleMedia = async () =>
  getRepository(Media)
    .createQueryBuilder('media')
    .where('media.mediaType = :mediaType', { mediaType: MediaType.MOVIE })
    .andWhere('(media.status = :available OR media.status4k = :available)', {
      available: MediaStatus.AVAILABLE,
    })
    .distinct(true)
    .orderBy('media.updatedAt', 'DESC')
    .take(80)
    .getMany();

const getVoteCounts = async (matchIds: number[]) => {
  if (!matchIds.length) {
    return new Map<number, Map<number, number>>();
  }

  const rows = await getRepository(MovieFightVote)
    .createQueryBuilder('vote')
    .leftJoin('vote.match', 'fightMatch')
    .leftJoin('vote.selectedMedia', 'selectedMedia')
    .select('fightMatch.id', 'matchId')
    .addSelect('selectedMedia.id', 'mediaId')
    .addSelect('COUNT(vote.id)', 'count')
    .where('fightMatch.id IN (:...matchIds)', { matchIds })
    .groupBy('fightMatch.id')
    .addGroupBy('selectedMedia.id')
    .getRawMany<{
      matchId: number | string;
      mediaId: number | string;
      count: number | string;
    }>();

  return rows.reduce((map, row) => {
    const matchId = Number(row.matchId);
    const mediaId = Number(row.mediaId);
    const inner = map.get(matchId) ?? new Map<number, number>();
    inner.set(mediaId, Number(row.count));
    map.set(matchId, inner);
    return map;
  }, new Map<number, Map<number, number>>());
};

const getMyVotes = async (matchIds: number[], userId?: number) => {
  if (!matchIds.length || !userId) {
    return new Map<number, number>();
  }

  const votes = await getRepository(MovieFightVote).find({
    where: { match: { id: In(matchIds) }, user: { id: userId } },
    relations: { match: true, selectedMedia: true },
  });

  return new Map(votes.map((vote) => [vote.match.id, vote.selectedMedia.id]));
};

const createRoundMatches = async (
  tournament: MovieFightTournament,
  round: number,
  media: Media[],
  startsAt: Date
) => {
  const matchRepository = getRepository(MovieFightMatch);
  const windowHours = Math.max(1, tournament.votingWindowHours || 24);
  const matchesPerDay = Math.min(4, Math.max(1, tournament.matchesPerDay || 2));

  for (let index = 0; index < media.length; index += 2) {
    const contenderA = media[index];
    const contenderB = media[index + 1];
    if (!contenderA || !contenderB) {
      continue;
    }

    const matchIndex = index / 2;
    const scheduleGroup = Math.floor(matchIndex / matchesPerDay);
    const nextStart = addHours(startsAt, scheduleGroup * windowHours);
    const closesAt = addHours(nextStart, windowHours);
    await matchRepository.save(
      new MovieFightMatch({
        tournament,
        round,
        matchNumber: index / 2 + 1,
        status:
          nextStart.getTime() <= Date.now()
            ? MovieFightMatchStatus.VOTING
            : MovieFightMatchStatus.SCHEDULED,
        startsAt: nextStart,
        closesAt,
        contenderA,
        contenderB,
      })
    );
  }
};

const resolveMatch = async (match: MovieFightMatch, now: Date) => {
  if (!match.contenderA || !match.contenderB) {
    return false;
  }

  const counts = await getVoteCounts([match.id]);
  const matchCounts = counts.get(match.id) ?? new Map<number, number>();
  const contenderAVotes = matchCounts.get(match.contenderA.id) ?? 0;
  const contenderBVotes = matchCounts.get(match.contenderB.id) ?? 0;

  if (contenderAVotes === contenderBVotes) {
    match.status = MovieFightMatchStatus.VOTING;
    match.closesAt = addHours(now, 24);
    match.extendedCount = (match.extendedCount ?? 0) + 1;
    await getRepository(MovieFightMatch).save(match);
    return false;
  }

  match.winner =
    contenderAVotes > contenderBVotes ? match.contenderA : match.contenderB;
  match.status = MovieFightMatchStatus.COMPLETED;
  match.completedAt = now;
  await getRepository(MovieFightMatch).save(match);
  return true;
};

const createReadyNextRoundMatches = async (
  tournament: MovieFightTournament,
  startsAt: Date
) => {
  const matchRepository = getRepository(MovieFightMatch);
  const windowHours = Math.max(1, tournament.votingWindowHours || 24);
  const matches = await matchRepository.find({
    where: { tournament: { id: tournament.id } },
    relations: {
      tournament: true,
      contenderA: true,
      contenderB: true,
      winner: true,
    },
    order: { round: 'ASC', matchNumber: 'ASC' },
  });
  let created = 0;

  const rounds = [...new Set(matches.map((match) => match.round))].sort(
    (a, b) => a - b
  );
  const firstRoundMatchCount = matches.filter(
    (match) => match.round === 1
  ).length;

  for (const round of rounds) {
    const nextRound = round + 1;
    const currentRoundStart = getFirstMatchNumberForRound(
      firstRoundMatchCount,
      round
    );
    const nextRoundStart = getFirstMatchNumberForRound(
      firstRoundMatchCount,
      nextRound
    );
    const nextRoundMatches = matches.filter(
      (match) => match.round === nextRound
    );
    const completedRoundMatches = matches
      .filter(
        (match) =>
          match.round === round &&
          match.status === MovieFightMatchStatus.COMPLETED &&
          Boolean(match.winner)
      )
      .sort((a, b) => a.matchNumber - b.matchNumber);

    const groups = completedRoundMatches.reduce((map, match) => {
      const currentRoundSlot = match.matchNumber - currentRoundStart + 1;
      const nextMatchNumber =
        nextRoundStart + Math.ceil(currentRoundSlot / 2) - 1;
      map.set(nextMatchNumber, [...(map.get(nextMatchNumber) ?? []), match]);
      return map;
    }, new Map<number, MovieFightMatch[]>());

    for (const [nextMatchNumber, sourceMatches] of groups.entries()) {
      if (sourceMatches.length !== 2) {
        continue;
      }

      const existing = nextRoundMatches.find(
        (match) => match.matchNumber === nextMatchNumber
      );
      if (existing) {
        continue;
      }

      const [left, right] = sourceMatches.sort(
        (a, b) => a.matchNumber - b.matchNumber
      );
      if (!left.winner || !right.winner) {
        continue;
      }

      await matchRepository.save(
        new MovieFightMatch({
          tournament,
          round: nextRound,
          matchNumber: nextMatchNumber,
          status:
            startsAt.getTime() <= Date.now()
              ? MovieFightMatchStatus.VOTING
              : MovieFightMatchStatus.SCHEDULED,
          startsAt,
          closesAt: addHours(startsAt, windowHours),
          contenderA: left.winner,
          contenderB: right.winner,
        })
      );
      created += 1;
    }
  }

  return created;
};

const getExpectedTournamentMatchCount = async (
  tournament: MovieFightTournament
) => {
  const entryCount = await getRepository(MovieFightEntry).count({
    where: { tournament: { id: tournament.id } },
  });

  return Math.max(0, entryCount - 1);
};

const processTournament = async (tournament: MovieFightTournament) => {
  if (tournament.status !== MovieFightTournamentStatus.ACTIVE) {
    return tournament;
  }

  const now = new Date();
  const tournamentRepository = getRepository(MovieFightTournament);
  const matchRepository = getRepository(MovieFightMatch);

  const matches = await matchRepository.find({
    where: { tournament: { id: tournament.id } },
    relations: {
      tournament: true,
      contenderA: true,
      contenderB: true,
      winner: true,
    },
    order: { round: 'ASC', matchNumber: 'ASC' },
  });

  for (const match of matches) {
    if (
      match.status === MovieFightMatchStatus.SCHEDULED &&
      match.startsAt.getTime() <= now.getTime()
    ) {
      match.status = MovieFightMatchStatus.VOTING;
      await matchRepository.save(match);

      const details = match.contenderA
        ? await movieDetails(match.contenderA)
        : undefined;
      await sendMovieFightNotification(
        {
          en: 'Movie Fight duel is open',
          pt: 'Duelo Movie Fight aberto',
        },
        {
          en: 'A new Movie Fight duel is ready. Open Seerr+ and vote for the film you want to advance.',
          pt: 'Há um novo duelo Movie Fight pronto. Abre o Seerr+ e vota no filme que queres que avance.',
        },
        { posterPath: details?.posterPath }
      );
    }

    if (
      match.status === MovieFightMatchStatus.VOTING &&
      match.closesAt.getTime() <= now.getTime()
    ) {
      await resolveMatch(match, now);
    }
  }

  const refreshedMatches = await matchRepository.find({
    where: { tournament: { id: tournament.id } },
    relations: {
      tournament: true,
      contenderA: true,
      contenderB: true,
      winner: true,
    },
    order: { round: 'ASC', matchNumber: 'ASC' },
  });

  const expectedMatchCount = await getExpectedTournamentMatchCount(tournament);
  if (expectedMatchCount > 0 && refreshedMatches.length < expectedMatchCount) {
    await createReadyNextRoundMatches(tournament, addHours(now, 1));
  }

  const hasOpenOrScheduled = refreshedMatches.some(
    (match) =>
      match.status === MovieFightMatchStatus.SCHEDULED ||
      match.status === MovieFightMatchStatus.VOTING
  );

  if (hasOpenOrScheduled) {
    return tournament;
  }

  if (expectedMatchCount <= 0 || refreshedMatches.length < expectedMatchCount) {
    await createReadyNextRoundMatches(tournament, addHours(now, 1));
    return tournament;
  }

  const hasPendingResult = refreshedMatches.some(
    (match) => match.status !== MovieFightMatchStatus.COMPLETED || !match.winner
  );

  if (hasPendingResult) {
    return tournament;
  }

  const finalRound = Math.max(...refreshedMatches.map((match) => match.round));
  const finalMatches = refreshedMatches.filter(
    (match) => match.round === finalRound
  );
  const finalMatch = finalMatches.length === 1 ? finalMatches[0] : null;

  if (
    finalMatch &&
    finalMatch.status === MovieFightMatchStatus.COMPLETED &&
    finalMatch.winner
  ) {
    tournament.status = MovieFightTournamentStatus.COMPLETED;
    tournament.champion = finalMatch.winner;
    tournament.championDecidedAt = now;
    await tournamentRepository.save(tournament);
    const champion = await movieDetails(finalMatch.winner);
    await sendMovieFightNotification(
      {
        en: `Movie Fight champion: ${champion.title}`,
        pt: `Campeão Movie Fight: ${champion.title}`,
      },
      {
        en: `${champion.title} won the Movie Fight tournament. Open Seerr+ to see the full results.`,
        pt: `${champion.title} venceu o campeonato Movie Fight. Abre o Seerr+ para ver todos os resultados.`,
      },
      { posterPath: champion.posterPath }
    );
    void syncMediaToPlexWinnerCollection(
      finalMatch.winner,
      'movie-fight'
    ).catch(() => undefined);
    return tournament;
  }

  const winners = refreshedMatches
    .filter(
      (match) =>
        match.status === MovieFightMatchStatus.COMPLETED &&
        Boolean(match.winner)
    )
    .map((match) => match.winner)
    .filter((media): media is Media => Boolean(media));

  if (winners.length > 1) {
    await createReadyNextRoundMatches(tournament, addHours(now, 1));
  }

  return tournament;
};

const serializeMatch = async (
  match: MovieFightMatch,
  userId?: number,
  language?: string,
  counts?: Map<number, Map<number, number>>,
  myVotes?: Map<number, number>
) => {
  const matchCounts = counts?.get(match.id) ?? new Map<number, number>();
  const [contenderA, contenderB] = await Promise.all([
    match.contenderA ? movieDetails(match.contenderA, language) : null,
    match.contenderB ? movieDetails(match.contenderB, language) : null,
  ]);

  return {
    id: match.id,
    round: match.round,
    matchNumber: match.matchNumber,
    status: match.status,
    startsAt: match.startsAt,
    closesAt: match.closesAt,
    completedAt: match.completedAt,
    extendedCount: match.extendedCount ?? 0,
    isExtended: (match.extendedCount ?? 0) > 0,
    myVoteMediaId: myVotes?.get(match.id),
    contenderA: contenderA
      ? {
          ...contenderA,
          votes: match.contenderA
            ? (matchCounts.get(match.contenderA.id) ?? 0)
            : 0,
        }
      : null,
    contenderB: contenderB
      ? {
          ...contenderB,
          votes: match.contenderB
            ? (matchCounts.get(match.contenderB.id) ?? 0)
            : 0,
        }
      : null,
    winnerMediaId: match.winner?.id,
  };
};

const serializeTournament = async (
  tournament: MovieFightTournament,
  userId?: number,
  language?: string
) => {
  const matches = await getRepository(MovieFightMatch).find({
    where: { tournament: { id: tournament.id } },
    relations: {
      contenderA: true,
      contenderB: true,
      winner: true,
      tournament: true,
    },
    order: { round: 'ASC', startsAt: 'ASC', matchNumber: 'ASC' },
  });
  const matchIds = matches.map((match) => match.id);
  const counts = await getVoteCounts(matchIds);
  const myVotes = await getMyVotes(matchIds, userId);
  const serializedMatches = await Promise.all(
    matches.map((match) =>
      serializeMatch(match, userId, language, counts, myVotes)
    )
  );

  return {
    id: tournament.id,
    title: tournament.title,
    theme: tournament.theme,
    status: tournament.status,
    startsAt: tournament.startsAt,
    votingWindowHours: tournament.votingWindowHours,
    matchesPerDay: tournament.matchesPerDay ?? 2,
    champion: tournament.champion
      ? await movieDetails(tournament.champion, language)
      : null,
    championDecidedAt: tournament.championDecidedAt,
    canManage: false,
    matches: serializedMatches,
    activeMatches: serializedMatches.filter(
      (match) => match.status === MovieFightMatchStatus.VOTING
    ),
    upcomingMatches: serializedMatches.filter(
      (match) => match.status === MovieFightMatchStatus.SCHEDULED
    ),
    results: serializedMatches.filter(
      (match) => match.status === MovieFightMatchStatus.COMPLETED
    ),
  };
};

movieFightRoutes.get('/', async (req, res, next) => {
  try {
    const tournamentRepository = getRepository(MovieFightTournament);
    const activeTournament = await tournamentRepository.findOne({
      where: { status: MovieFightTournamentStatus.ACTIVE },
      relations: { champion: true },
      order: { createdAt: 'DESC' },
    });

    if (activeTournament) {
      await processTournament(activeTournament);
    }

    const currentTournament = activeTournament
      ? await tournamentRepository.findOne({
          where: { id: activeTournament.id },
          relations: { champion: true },
        })
      : null;
    const history = await tournamentRepository.find({
      where: [
        { status: MovieFightTournamentStatus.COMPLETED },
        { status: MovieFightTournamentStatus.CANCELLED },
      ],
      relations: { champion: true },
      order: { championDecidedAt: 'DESC', createdAt: 'DESC' },
      take: 10,
    });

    return res.json({
      tournament: currentTournament
        ? {
            ...(await serializeTournament(
              currentTournament,
              req.user?.id,
              req.locale
            )),
            canManage: canManageMovieFight(req),
          }
        : null,
      history: await Promise.all(
        history.map((tournament) =>
          serializeTournament(tournament, req.user?.id, req.locale)
        )
      ),
      themes: MOVIE_FIGHT_THEMES,
      canManage: canManageMovieFight(req),
    });
  } catch (error) {
    return next({
      status: 500,
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

movieFightRoutes.get('/eligible', async (req, res, next) => {
  try {
    if (!canManageMovieFight(req)) {
      return next({ status: 403, message: 'Administrator access required.' });
    }
    const currentUser = req.user;
    if (!currentUser) {
      return next({ status: 401, message: 'Authentication required.' });
    }

    const themeId = getMovieFightTheme(req.query.theme).id;
    const allMedia = await getEligibleMedia();
    const details = await Promise.all(
      allMedia.map((item) => movieDetails(item, req.locale))
    );
    const filtered = details
      .filter((item) => detailMatchesTheme(item, themeId))
      .slice(0, 24);

    return res.json({
      results: shuffle(filtered).slice(0, 16),
      themes: MOVIE_FIGHT_THEMES,
    });
  } catch (error) {
    return next({
      status: 500,
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

movieFightRoutes.get('/winners/:mediaId', async (req, res, next) => {
  try {
    const mediaId = parsePositiveInteger(req.params.mediaId);
    if (!mediaId) {
      return next({ status: 400, message: 'Invalid media id.' });
    }

    const count = await getRepository(MovieFightTournament)
      .createQueryBuilder('tournament')
      .leftJoin('tournament.champion', 'champion')
      .where('champion.id = :mediaId', { mediaId })
      .getCount();

    return res.json({ winner: count > 0, count });
  } catch (error) {
    return next({
      status: 500,
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

movieFightRoutes.post('/tournaments', async (req, res, next) => {
  try {
    if (!canManageMovieFight(req)) {
      return next({ status: 403, message: 'Administrator access required.' });
    }
    const currentUser = req.user;
    if (!currentUser) {
      return next({ status: 401, message: 'Authentication required.' });
    }

    const mediaIds = parseUniquePositiveIntegers(req.body?.mediaIds, 16);
    if (![2, 4, 8, 16].includes(mediaIds.length)) {
      return next({
        status: 400,
        message: 'Movie Fight requires exactly 2, 4, 8, or 16 movies.',
      });
    }

    const existingTournament = await getRepository(
      MovieFightTournament
    ).findOne({
      where: { status: MovieFightTournamentStatus.ACTIVE },
    });
    if (existingTournament) {
      return next({
        status: 409,
        message: 'A Movie Fight tournament is already active.',
      });
    }

    const selectedMedia = await getAvailableMovieMediaByIds(mediaIds);
    if (selectedMedia.length !== mediaIds.length) {
      return next({
        status: 400,
        message: 'All Movie Fight candidates must be available Plex movies.',
      });
    }

    const orderedMedia = mediaIds
      .map((mediaId) => selectedMedia.find((item) => item.id === mediaId))
      .filter((item): item is Media => Boolean(item));
    const startsAt = req.body?.startsAt
      ? new Date(req.body.startsAt)
      : new Date();
    if (Number.isNaN(startsAt.getTime())) {
      return next({ status: 400, message: 'Invalid start date.' });
    }
    const votingWindowHours = Math.min(
      72,
      Math.max(parsePositiveInteger(req.body?.votingWindowHours) ?? 24, 1)
    );
    const matchesPerDay = Math.min(
      4,
      Math.max(parsePositiveInteger(req.body?.matchesPerDay) ?? 2, 1)
    );
    const theme = getMovieFightTheme(req.body?.theme);
    const title =
      normalizeText(req.body?.title, 80) || `${theme.label} Movie Fight`;

    const tournament = await getRepository(MovieFightTournament).save(
      new MovieFightTournament({
        title,
        theme: theme.id,
        status: MovieFightTournamentStatus.ACTIVE,
        startsAt,
        votingWindowHours,
        matchesPerDay,
        createdBy: currentUser,
      })
    );

    await getRepository(MovieFightEntry).save(
      orderedMedia.map(
        (media, index) =>
          new MovieFightEntry({
            tournament,
            media,
            seed: index + 1,
          })
      )
    );
    await createRoundMatches(tournament, 1, orderedMedia, startsAt);
    const firstMovie = await movieDetails(orderedMedia[0], req.locale);
    await sendMovieFightNotification(
      {
        en: `Movie Fight started: ${title}`,
        pt: `Movie Fight iniciado: ${title}`,
      },
      {
        en: 'The Movie Fight championship has started. A new 1v1 movie duel will be available each day.',
        pt: 'O campeonato Movie Fight começou. Todos os dias haverá um novo duelo 1v1 entre filmes.',
      },
      { posterPath: firstMovie.posterPath }
    );

    if (startsAt.getTime() <= Date.now()) {
      await sendMovieFightNotification(
        {
          en: 'Movie Fight duel is open',
          pt: 'Duelo Movie Fight aberto',
        },
        {
          en: 'The first Movie Fight duel is ready. Open Seerr+ and vote for the film you want to advance.',
          pt: 'O primeiro duelo Movie Fight está pronto. Abre o Seerr+ e vota no filme que queres que avance.',
        },
        { posterPath: firstMovie.posterPath }
      );
    }

    const createdTournament = await getRepository(
      MovieFightTournament
    ).findOneOrFail({
      where: { id: tournament.id },
      relations: { champion: true },
    });
    await processTournament(createdTournament);
    return res
      .status(201)
      .json(
        await serializeTournament(createdTournament, req.user?.id, req.locale)
      );
  } catch (error) {
    return next({
      status: 500,
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

movieFightRoutes.post('/matches/:matchId/vote', async (req, res, next) => {
  try {
    const matchId = parsePositiveInteger(req.params.matchId);
    const mediaId = parsePositiveInteger(req.body?.mediaId);
    const currentUser = req.user;
    if (!currentUser) {
      return next({ status: 401, message: 'Authentication required.' });
    }
    if (!matchId || !mediaId) {
      return next({ status: 400, message: 'Invalid Movie Fight vote.' });
    }

    const match = await getRepository(MovieFightMatch).findOne({
      where: { id: matchId },
      relations: { contenderA: true, contenderB: true, tournament: true },
    });
    if (!match) {
      return next({ status: 404, message: 'Movie Fight match not found.' });
    }

    await processTournament(match.tournament);

    const refreshedMatch = await getRepository(MovieFightMatch).findOne({
      where: { id: matchId },
      relations: { contenderA: true, contenderB: true, tournament: true },
    });
    if (
      !refreshedMatch ||
      refreshedMatch.status !== MovieFightMatchStatus.VOTING
    ) {
      return next({
        status: 409,
        message: 'This Movie Fight match is not open.',
      });
    }

    const selectedMedia =
      refreshedMatch.contenderA?.id === mediaId
        ? refreshedMatch.contenderA
        : refreshedMatch.contenderB?.id === mediaId
          ? refreshedMatch.contenderB
          : null;
    if (!selectedMedia) {
      return next({
        status: 400,
        message: 'Selected movie is not in this match.',
      });
    }

    await getRepository(MovieFightVote).query(
      isPgsql
        ? 'INSERT INTO "movie_fight_vote" ("matchId", "userId", "selectedMediaId") VALUES ($1, $2, $3) ON CONFLICT ("matchId", "userId") DO UPDATE SET "selectedMediaId" = EXCLUDED."selectedMediaId"'
        : 'INSERT INTO "movie_fight_vote" ("matchId", "userId", "selectedMediaId") VALUES (?, ?, ?) ON CONFLICT("matchId", "userId") DO UPDATE SET "selectedMediaId" = excluded."selectedMediaId"',
      [refreshedMatch.id, currentUser.id, selectedMedia.id]
    );

    return res.json({ ok: true });
  } catch (error) {
    return next({
      status: 500,
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

movieFightRoutes.post('/matches/:matchId/finish', async (req, res, next) => {
  try {
    if (!canManageMovieFight(req)) {
      return next({ status: 403, message: 'Administrator access required.' });
    }

    const matchId = parsePositiveInteger(req.params.matchId);
    if (!matchId) {
      return next({ status: 400, message: 'Invalid Movie Fight match.' });
    }

    const match = await getRepository(MovieFightMatch).findOne({
      where: { id: matchId },
      relations: {
        contenderA: true,
        contenderB: true,
        tournament: true,
        winner: true,
      },
    });
    if (!match) {
      return next({ status: 404, message: 'Movie Fight match not found.' });
    }
    if (match.status !== MovieFightMatchStatus.VOTING) {
      return next({
        status: 409,
        message: 'This Movie Fight match is not open.',
      });
    }

    const completed = await resolveMatch(match, new Date());
    return res.json({ ok: true, completed });
  } catch (error) {
    return next({
      status: 500,
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

movieFightRoutes.post('/matches/:matchId/start', async (req, res, next) => {
  try {
    if (!canManageMovieFight(req)) {
      return next({ status: 403, message: 'Administrator access required.' });
    }

    const matchId = parsePositiveInteger(req.params.matchId);
    if (!matchId) {
      return next({ status: 400, message: 'Invalid Movie Fight match.' });
    }

    const match = await getRepository(MovieFightMatch).findOne({
      where: { id: matchId },
      relations: {
        contenderA: true,
        contenderB: true,
        tournament: true,
      },
    });
    if (!match) {
      return next({ status: 404, message: 'Movie Fight match not found.' });
    }
    if (match.status !== MovieFightMatchStatus.SCHEDULED) {
      return next({
        status: 409,
        message: 'This Movie Fight match is not scheduled.',
      });
    }
    if (!match.contenderA || !match.contenderB) {
      return next({
        status: 409,
        message: 'This Movie Fight match is not ready to start.',
      });
    }

    const now = new Date();
    const windowHours = Math.max(1, match.tournament.votingWindowHours || 24);
    match.status = MovieFightMatchStatus.VOTING;
    match.startsAt = now;
    match.closesAt = addHours(now, windowHours);
    await getRepository(MovieFightMatch).save(match);

    const details = await movieDetails(match.contenderA);
    await sendMovieFightNotification(
      {
        en: 'Movie Fight duel is open',
        pt: 'Duelo Movie Fight aberto',
      },
      {
        en: 'A new Movie Fight duel is ready. Open Seerr+ and vote for the film you want to advance.',
        pt: 'Há um novo duelo Movie Fight pronto. Abre o Seerr+ e vota no filme que queres que avance.',
      },
      { posterPath: details?.posterPath }
    );

    return res.json({ ok: true });
  } catch (error) {
    return next({
      status: 500,
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

movieFightRoutes.post(
  '/tournaments/:id/start-ready',
  async (req, res, next) => {
    try {
      if (!canManageMovieFight(req)) {
        return next({ status: 403, message: 'Administrator access required.' });
      }

      const tournamentId = parsePositiveInteger(req.params.id);
      if (!tournamentId) {
        return next({ status: 400, message: 'Invalid tournament id.' });
      }

      const tournament = await getRepository(MovieFightTournament).findOne({
        where: { id: tournamentId, status: MovieFightTournamentStatus.ACTIVE },
        relations: { champion: true },
      });
      if (!tournament) {
        return next({
          status: 404,
          message: 'Movie Fight tournament not found.',
        });
      }

      const created = await createReadyNextRoundMatches(tournament, new Date());
      return res.json({ ok: true, created });
    } catch (error) {
      return next({
        status: 500,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

movieFightRoutes.post('/process', async (req, res, next) => {
  try {
    if (!canManageMovieFight(req)) {
      return next({ status: 403, message: 'Administrator access required.' });
    }
    const activeTournament = await getRepository(MovieFightTournament).findOne({
      where: { status: MovieFightTournamentStatus.ACTIVE },
      relations: { champion: true },
      order: { createdAt: 'DESC' },
    });
    if (!activeTournament) {
      return res.json({ ok: true });
    }
    await processTournament(activeTournament);
    return res.json({ ok: true });
  } catch (error) {
    return next({
      status: 500,
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

movieFightRoutes.post('/tournaments/:id/cancel', async (req, res, next) => {
  try {
    if (!canManageMovieFight(req)) {
      return next({ status: 403, message: 'Administrator access required.' });
    }
    const tournamentId = parsePositiveInteger(req.params.id);
    if (!tournamentId) {
      return next({ status: 400, message: 'Invalid tournament id.' });
    }
    const tournament = await getRepository(MovieFightTournament).findOne({
      where: { id: tournamentId },
    });
    if (!tournament) {
      return next({
        status: 404,
        message: 'Movie Fight tournament not found.',
      });
    }
    tournament.status = MovieFightTournamentStatus.CANCELLED;
    await getRepository(MovieFightTournament).save(tournament);
    await getRepository(MovieFightMatch).query(
      isPgsql
        ? 'UPDATE "movie_fight_match" SET "status" = $1 WHERE "tournamentId" = $2 AND "status" != $3'
        : 'UPDATE "movie_fight_match" SET "status" = ? WHERE "tournamentId" = ? AND "status" != ?',
      [
        MovieFightMatchStatus.CANCELLED,
        tournament.id,
        MovieFightMatchStatus.COMPLETED,
      ]
    );
    return res.json({ ok: true });
  } catch (error) {
    return next({
      status: 500,
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

export default movieFightRoutes;
