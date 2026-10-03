const fs = require('fs');

const routePath = 'server/routes/movieclub.ts';
let code = fs.readFileSync(routePath, 'utf-8');

const originalEndpoint = `movieClubRoutes.post('/sessions/:sessionId/resolve', async (req, res, next) => {
  try {
    const repository = getRepository(MovieClubSession);
    const sessionId = parsePositiveInteger(req.params.sessionId);
    if (!sessionId) {
      return next({ status: 400, message: 'Invalid Movie Club session id.' });
    }

    const session = await repository.findOne({
      where: { id: sessionId },
      relations: { candidates: { media: true, votes: true }, votes: true, curators: { user: true } },
    });
    if (!session) return next({ status: 404, message: 'Movie Club session not found.' });
    if (!canManageSession(req, session)) return next({ status: 403, message: 'Movie Club manager access required.' });
    if (session.status !== MovieClubSessionStatus.VOTING) return next({ status: 409, message: 'Voting is not active.' });
    if (session.closesAt > new Date()) return next({ status: 409, message: 'Voting is still open.' });
    const ranked = [...session.candidates].sort((a, b) => b.votes.length - a.votes.length);
    const topVotes = ranked[0]?.votes.length ?? 0;
    const leaders = ranked.filter((candidate) => candidate.votes.length === topVotes);
    if (leaders.length === 1) {
      session.status = MovieClubSessionStatus.SELECTED;
      session.selectedMedia = leaders[0].media;
      session.selectedAt = new Date();
      await repository.save(session);
      const selectedMovie = await movieDetails(leaders[0].media, req.locale);
      await sendMovieClubEmail(
        {
          en: \`Movie Club winner: \${selectedMovie.title}\`,
          pt: \`Vencedor do Movie Club: \${selectedMovie.title}\`,
        },
        {
          en: \`The votes are in. \${selectedMovie.title} is the Film of the Week with \${topVotes} votes. \${requesterText(selectedMovie)} Watch it on Plex, read the synopsis in Seerr+, and join the Movie Club discussion.\`,
          pt: \`Os votos estão fechados. \${selectedMovie.title} é o Filme da Semana com \${topVotes} votos. \${requesterText(selectedMovie, true)} Vê no Plex, lê a sinopse no Seerr+ e junta-te à conversa do Movie Club.\`,
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
      return res.json({ tie: false, winner: selectedMovie });
    }
    const lowestVotes = Math.min(...ranked.map((candidate) => candidate.votes.length));
    const lowest = ranked.filter((candidate) => candidate.votes.length === lowestVotes);
    const interestCounts = await Promise.all(lowest.map(async (candidate) => ({ candidate, count: (await getMediaRequesters(candidate.media.id, false)).length })));
    interestCounts.sort((a, b) => a.count - b.count || b.candidate.id - a.candidate.id);
    await getRepository(MovieClubCandidate).remove(interestCounts[0].candidate);
    await getRepository(MovieClubVote).delete({ session: { id: session.id } });
    session.closesAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await repository.save(session);
    const remainingMovies = await Promise.all(
      ranked
        .filter((candidate) => candidate.id !== interestCounts[0].candidate.id)
        .map((candidate) => movieDetails(candidate.media, req.locale))
    );
    await sendMovieClubEmail(
      {
        en: 'Movie Club tie-break: voting extended',
        pt: 'Desempate do Movie Club: votação prolongada',
      },
      {
        en: 'This week\\'s vote ended in a tie. The previous votes have been cleared, the lowest-ranked candidate has been removed, and voting is open again for another 24 hours. Open the remaining film pages to read the synopses and cast your new vote.',
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
    return res.json({ tie: true, closesAt: session.closesAt });
  } catch (error) {
    return next({ status: 500, message: error instanceof Error ? error.message : String(error) });
  }
});`;

const newCode = `export const resolveMovieClubSession = async (session: MovieClubSession, locale = 'en') => {
  const repository = getRepository(MovieClubSession);
  const ranked = [...session.candidates].sort((a, b) => b.votes.length - a.votes.length);
  const topVotes = ranked[0]?.votes.length ?? 0;
  const leaders = ranked.filter((candidate) => candidate.votes.length === topVotes);
  if (leaders.length === 1) {
    session.status = MovieClubSessionStatus.SELECTED;
    session.selectedMedia = leaders[0].media;
    session.selectedAt = new Date();
    await repository.save(session);
    const selectedMovie = await movieDetails(leaders[0].media, locale);
    await sendMovieClubEmail(
      {
        en: \`Movie Club winner: \${selectedMovie.title}\`,
        pt: \`Vencedor do Movie Club: \${selectedMovie.title}\`,
      },
      {
        en: \`The votes are in. \${selectedMovie.title} is the Film of the Week with \${topVotes} votes. \${requesterText(selectedMovie)} Watch it on Plex, read the synopsis in Seerr+, and join the Movie Club discussion.\`,
        pt: \`Os votos estão fechados. \${selectedMovie.title} é o Filme da Semana com \${topVotes} votos. \${requesterText(selectedMovie, true)} Vê no Plex, lê a sinopse no Seerr+ e junta-te à conversa do Movie Club.\`,
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
  const lowestVotes = Math.min(...ranked.map((candidate) => candidate.votes.length));
  const lowest = ranked.filter((candidate) => candidate.votes.length === lowestVotes);
  const interestCounts = await Promise.all(lowest.map(async (candidate) => ({ candidate, count: (await getMediaRequesters(candidate.media.id, false)).length })));
  interestCounts.sort((a, b) => a.count - b.count || b.candidate.id - a.candidate.id);
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
      en: 'This week\\'s vote ended in a tie. The previous votes have been cleared, the lowest-ranked candidate has been removed, and voting is open again for another 24 hours. Open the remaining film pages to read the synopses and cast your new vote.',
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
      relations: { candidates: { media: true, votes: true }, votes: true, curators: { user: true } },
    });
    if (!session) return next({ status: 404, message: 'Movie Club session not found.' });
    if (!canManageSession(req, session)) return next({ status: 403, message: 'Movie Club manager access required.' });
    if (session.status !== MovieClubSessionStatus.VOTING) return next({ status: 409, message: 'Voting is not active.' });
    if (session.closesAt > new Date()) return next({ status: 409, message: 'Voting is still open.' });
    
    const result = await resolveMovieClubSession(session, req.locale);
    return res.json(result);
  } catch (error) {
    return next({ status: 500, message: error instanceof Error ? error.message : String(error) });
  }
});`;

if (!code.includes("export const resolveMovieClubSession")) {
    code = code.replace(originalEndpoint, newCode);
    fs.writeFileSync(routePath, code);
    console.log('Refactored movieclub.ts');
} else {
    console.log('Already refactored');
}
