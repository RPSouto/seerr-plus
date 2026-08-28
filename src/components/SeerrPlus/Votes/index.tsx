import Button from '@app/components/Common/Button';
import CachedImage from '@app/components/Common/CachedImage';
import PageTitle from '@app/components/Common/PageTitle';
import defineMessages from '@app/utils/defineMessages';
import {
  ArchiveBoxXMarkIcon,
  ClockIcon,
  FilmIcon,
  HandThumbDownIcon,
  HandThumbUpIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline';
import type { MovieDetails } from '@server/models/Movie';
import type { TvDetails } from '@server/models/Tv';
import axios from 'axios';
import Link from 'next/link';
import { useIntl } from 'react-intl';
import useSWR from 'swr';

const messages = defineMessages('components.SeerrPlus.Votes', {
  title: 'Votes',
  description: 'Follow active community votes and recent vote decisions.',
  movieClub: 'Movie Club',
  movieClubDescription:
    'Vote for the community film of the week and follow the selected winner.',
  openMovieClub: 'Open Movie Club',
  noMovieClubVote: 'No Movie Club vote is active right now.',
  removalVotes: 'Removal Votes',
  removalVotesDescription:
    'Follow removal votes, vote when you are invited, and see the current opinion before the admin decision.',
  noRemovalVotes: 'No removal votes are available for you right now.',
  activeRemovalVotes: 'Active Removal Votes',
  activeRemovalVotesDescription:
    'Votes currently open for your decision or review.',
  closedRemovalVotes: 'Previous Removal Votes',
  closedRemovalVotesDescription:
    'Closed removal votes are kept here so users can review previous decisions.',
  noActiveRemovalVotes: 'No active removal votes right now.',
  noClosedRemovalVotes: 'No previous removal votes yet.',
  voted: 'Vote saved.',
  voteFailed: 'Unable to save your vote.',
  requestedBy: 'Requested by {user}',
  active: 'Active',
  closed: 'Closed',
  createdAt: 'Opened {date}',
  removeCount: '{count} remove',
  keepCount: '{count} keep',
  votedCount: '{total}/{invited} voted',
  voteRemoveA11y: 'Vote to remove {title}',
  voteKeepA11y: 'Vote to keep {title}',
});

type MovieClubSession = {
  id: number;
  status: number;
  title?: string;
  closesAt: string;
  totalVotes: number;
  candidates: { id: number; title: string; votes: number }[];
};

type MovieClubResponse = {
  session: MovieClubSession | null;
};

type RemovalVote = {
  id: number;
  issueId?: number;
  status: number;
  reason?: string;
  createdAt: string;
  createdBy: { id: number; displayName: string };
  canVote: boolean;
  myVote?: number;
  media: {
    id: number;
    tmdbId: number;
    mediaType: 'movie' | 'tv';
    title: string;
  };
  totals: {
    agree: number;
    keep: number;
    total: number;
    interested: number;
  };
};

type VotesResponse = {
  removalVotes: RemovalVote[];
};

const mediaPath = (vote: RemovalVote) =>
  vote.media.mediaType === 'tv'
    ? `/tv/${vote.media.tmdbId}`
    : `/movie/${vote.media.tmdbId}`;

const isFallbackTitle = (vote: RemovalVote) =>
  vote.media.title ===
  `${vote.media.mediaType === 'tv' ? 'Series' : 'Movie'} #${
    vote.media.tmdbId
  }`;

const RemovalVoteCard = ({
  vote,
  onVote,
}: {
  vote: RemovalVote;
  onVote: (sessionId: number, vote: 'agree' | 'keep') => Promise<void>;
}) => {
  const intl = useIntl();
  const { data: mediaDetails } = useSWR<MovieDetails | TvDetails>(
    `/api/v1/${vote.media.mediaType}/${vote.media.tmdbId}`
  );
  const resolvedTitle =
    !isFallbackTitle(vote)
      ? vote.media.title
      : mediaDetails && 'title' in mediaDetails
      ? mediaDetails.title
      : mediaDetails && 'name' in mediaDetails
        ? mediaDetails.name
        : vote.media.title;
  const posterPath =
    mediaDetails?.posterPath &&
    `https://image.tmdb.org/t/p/w600_and_h900_bestv2${mediaDetails.posterPath}`;
  return (
    <div
      key={vote.id}
      className={`rounded-xl border p-3 shadow-sm sm:p-4 ${
        vote.status === 0
          ? 'border-red-500/40 bg-gradient-to-br from-gray-800 to-gray-900'
          : 'border-gray-700 bg-gray-800/50'
      }`}
    >
      <div className="flex items-start gap-3">
        <Link
          href={mediaPath(vote)}
          className="relative h-24 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-gray-700 bg-gray-900 transition hover:border-gray-400 sm:h-28 sm:w-20"
        >
          <CachedImage
            src={posterPath || '/images/seerr_poster_not_found.png'}
            type="tmdb"
            alt=""
            fill
            style={{ objectFit: 'cover' }}
          />
        </Link>
        <div className="min-w-0">
          <div
            className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
              vote.status === 0 ? 'text-red-200' : 'text-gray-400'
            }`}
          >
            {intl.formatMessage(
              vote.status === 0 ? messages.active : messages.closed
            )}
          </div>
          <Link
            href={mediaPath(vote)}
            className="mt-1 line-clamp-2 text-base font-semibold leading-tight text-white hover:underline sm:text-lg"
          >
            {resolvedTitle}
          </Link>
          <div className="mt-1 text-sm text-gray-400">
            {intl.formatMessage(messages.requestedBy, {
              user: vote.createdBy.displayName,
            })}
          </div>
          <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
            <ClockIcon className="h-4 w-4" />
            {intl.formatMessage(messages.createdAt, {
              date: new Date(vote.createdAt).toLocaleDateString(),
            })}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-semibold text-gray-200">
        <button
          type="button"
          disabled={vote.status !== 0 || !vote.canVote}
          aria-label={intl.formatMessage(messages.voteRemoveA11y, {
            title: resolvedTitle,
          })}
          onClick={() => onVote(vote.id, 'agree')}
          className={`rounded-lg border px-2 py-2 transition ${
            vote.myVote === 1
              ? 'border-red-400 bg-red-600/80 text-white'
              : 'border-red-500/30 bg-red-500/10 hover:border-red-400 hover:bg-red-500/20'
          } disabled:cursor-default disabled:hover:border-red-500/30 disabled:hover:bg-red-500/10`}
        >
          <HandThumbUpIcon className="mx-auto mb-1 h-4 w-4 text-red-200" />
          {intl.formatMessage(messages.removeCount, {
            count: vote.totals.agree,
          })}
        </button>
        <button
          type="button"
          disabled={vote.status !== 0 || !vote.canVote}
          aria-label={intl.formatMessage(messages.voteKeepA11y, {
            title: resolvedTitle,
          })}
          onClick={() => onVote(vote.id, 'keep')}
          className={`rounded-lg border px-2 py-2 transition ${
            vote.myVote === 2
              ? 'border-green-400 bg-green-600/80 text-white'
              : 'border-green-500/30 bg-green-500/10 hover:border-green-400 hover:bg-green-500/20'
          } disabled:cursor-default disabled:hover:border-green-500/30 disabled:hover:bg-green-500/10`}
        >
          <HandThumbDownIcon className="mx-auto mb-1 h-4 w-4 text-green-200" />
          {intl.formatMessage(messages.keepCount, {
            count: vote.totals.keep,
          })}
        </button>
        <div className="rounded-lg border border-gray-600 bg-black/20 px-2 py-2">
          <FilmIcon className="mx-auto mb-1 h-4 w-4 text-gray-300" />
          {intl.formatMessage(messages.votedCount, {
            total: vote.totals.total,
            invited: vote.totals.interested,
          })}
        </div>
      </div>

    </div>
  );
};

const Votes = () => {
  const intl = useIntl();
  const { data: movieClub } = useSWR<MovieClubResponse>(
    '/api/v1/seerrplus/movie-club'
  );
  const { data: votes, mutate } = useSWR<VotesResponse>(
    '/api/v1/seerrplus/votes'
  );

  const castRemovalVote = async (
    sessionId: number,
    vote: 'agree' | 'keep'
  ) => {
    try {
      await axios.post(`/api/v1/seerrplus/removal-votes/${sessionId}/vote`, {
        vote,
      });
      await mutate();
    } catch {
      // The page is intentionally quiet; failed votes still leave the button
      // enabled so the user can retry.
    }
  };

  const activeRemovalVotes =
    votes?.removalVotes.filter((vote) => vote.status === 0) ?? [];
  const closedRemovalVotes =
    votes?.removalVotes.filter((vote) => vote.status !== 0) ?? [];
  const activeMovieClubSession =
    movieClub?.session?.status === 0 &&
    new Date(movieClub.session.closesAt).getTime() > Date.now()
      ? movieClub.session
      : null;

  return (
    <>
      <PageTitle title={intl.formatMessage(messages.title)} />
      <div className="mb-4 rounded-xl border border-indigo-500/40 bg-gray-900/70 p-4 sm:mb-6 sm:p-6">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">
          {intl.formatMessage(messages.title)}
        </h1>
        <p className="mt-1 text-sm text-gray-300 sm:mt-2 sm:text-base">
          {intl.formatMessage(messages.description)}
        </p>
      </div>

      <section className="mb-4 rounded-xl border border-amber-500/40 bg-gray-900/70 p-4 sm:mb-8 sm:p-5">
        <div className="mb-3 flex items-center gap-3 sm:mb-4">
          <TrophyIcon className="h-6 w-6 flex-shrink-0 text-amber-300 sm:h-7 sm:w-7" />
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-white sm:text-xl">
              {intl.formatMessage(messages.movieClub)}
            </h2>
            <p className="hidden text-sm text-gray-400 sm:block">
              {intl.formatMessage(messages.movieClubDescription)}
            </p>
          </div>
        </div>
        {activeMovieClubSession ? (
          <div className="rounded-lg border border-gray-700 bg-gray-800/70 p-3 sm:p-4">
            <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="truncate font-semibold text-white">
                  {activeMovieClubSession.title ||
                    intl.formatMessage(messages.movieClub)}
                </div>
                <div className="mt-1 text-sm text-gray-400">
                  {new Date(activeMovieClubSession.closesAt).toLocaleString()}{' '}
                  · {activeMovieClubSession.totalVotes} votes
                </div>
              </div>
              <Button
                as="a"
                href="/movie-club"
                buttonType="primary"
                className="w-full sm:w-auto"
              >
                {intl.formatMessage(messages.openMovieClub)}
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-700 bg-gray-800/60 p-4 text-gray-400">
            {intl.formatMessage(messages.noMovieClubVote)}
          </div>
        )}
      </section>

      <section className="mb-4 rounded-xl border border-red-500/30 bg-gray-900/70 p-4 sm:mb-8 sm:p-5">
        <div className="mb-3 flex items-center gap-3 sm:mb-4">
          <ArchiveBoxXMarkIcon className="h-6 w-6 flex-shrink-0 text-red-300 sm:h-7 sm:w-7" />
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-white sm:text-xl">
              {intl.formatMessage(messages.activeRemovalVotes)}
            </h2>
            <p className="hidden text-sm text-gray-400 sm:block">
              {intl.formatMessage(messages.activeRemovalVotesDescription)}
            </p>
          </div>
        </div>

        {activeRemovalVotes.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {activeRemovalVotes.map((vote) => (
              <RemovalVoteCard
                key={vote.id}
                vote={vote}
                onVote={castRemovalVote}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-gray-700 bg-gray-800/60 p-4 text-sm text-gray-400">
            {intl.formatMessage(messages.noActiveRemovalVotes)}
          </div>
        )}
      </section>

      <details className="rounded-xl border border-gray-700 bg-gray-900/70 p-4 sm:p-5">
        <summary className="flex cursor-pointer list-none items-center gap-3">
          <ArchiveBoxXMarkIcon className="h-6 w-6 flex-shrink-0 text-gray-400 sm:h-7 sm:w-7" />
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-white sm:text-xl">
              {intl.formatMessage(messages.closedRemovalVotes)}
            </h2>
            <p className="hidden text-sm text-gray-400 sm:block">
              {intl.formatMessage(messages.closedRemovalVotesDescription)}
            </p>
          </div>
        </summary>
        <div className="mt-4">
          {closedRemovalVotes.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {closedRemovalVotes.map((vote) => (
                <RemovalVoteCard
                  key={vote.id}
                  vote={vote}
                  onVote={castRemovalVote}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-gray-700 bg-gray-800/60 p-4 text-sm text-gray-400">
              {intl.formatMessage(messages.noClosedRemovalVotes)}
            </div>
          )}
        </div>
      </details>
    </>
  );
};

export default Votes;
