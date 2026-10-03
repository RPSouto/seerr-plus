const fs = require('fs');

const path = 'server/job/movieClubScheduler.ts';
let code = fs.readFileSync(path, 'utf-8');

const importStmt = "import { resolveMovieClubSession } from '@server/routes/movieclub';\n";
if (!code.includes("resolveMovieClubSession")) {
  code = importStmt + code;
}

const newProcessFn = `export const processScheduledMovieClubSessions = async () => {
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
      relations: { candidates: { media: true, votes: true }, votes: true, curators: { user: true } },
    });

    for (const session of endingSessions) {
      try {
        const result = await resolveMovieClubSession(session, 'en');
        logger.info(\`Automatically resolved Movie Club vote \${session.id}\`, {
          label: 'Seerr+',
          sessionId: session.id,
          result,
        });
      } catch (err) {
        logger.error(\`Failed to automatically resolve Movie Club vote \${session.id}\`, {
          label: 'Seerr+',
          sessionId: session.id,
          error: err instanceof Error ? err.message : String(err),
        });
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
};`;

// Replace the old processScheduledMovieClubSessions with the new one
const fnRegex = /export const processScheduledMovieClubSessions = async \(\) => \{[\s\S]*?\} finally \{\s+running = false;\s+\}\s+\};/;
code = code.replace(fnRegex, newProcessFn);

fs.writeFileSync(path, code);
console.log('Scheduler patched!');
