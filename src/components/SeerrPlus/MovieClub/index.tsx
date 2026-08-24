import Button from '@app/components/Common/Button';
import PageTitle from '@app/components/Common/PageTitle';
import { Permission, useUser } from '@app/hooks/useUser';
import defineMessages from '@app/utils/defineMessages';
import { ChatBubbleLeftRightIcon, TrophyIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import useSWR from 'swr';

type Candidate = {
  id: number;
  mediaId: number;
  tmdbId: number;
  title: string;
  releaseDate?: string;
  posterPath?: string;
  overview?: string;
  votes: number;
  weeklySuggestions?: number;
  suggestedByMe?: boolean;
  interestedUserCount: number;
  interestedUsers: { id: number; displayName: string }[];
  hasWonMovieClub?: boolean;
};
type Session = {
  id: number;
  status: number;
  title?: string;
  startsAt?: string;
  closesAt: string;
  whatsappUrl?: string;
  selectedCandidateId?: number;
  candidates: Candidate[];
  totalVotes: number;
  myVoteCandidateId?: number;
  canManage: boolean;
  curators: ClubUser[];
};
type ClubData = { session: Session | null };
type ClubUser = { id: number; displayName: string; avatar?: string };

const messages = defineMessages('components.SeerrPlus.MovieClub', {
  title: 'Movie Club',
  description:
    'Vote for requested movies already available in Plex, watch together, then discuss them on WhatsApp.',
  filmOfTheWeek: 'Film of the Week: {title}',
  voteThisWeek: "Vote for this week's film",
  highlightSelected:
    'Watch it in Plex, then join the WhatsApp discussion.',
  highlightVoting:
    '{count} requested films available in Plex are waiting for your vote.',
  interested: 'Interested',
  votes: '{count, plural, one {# vote} other {# votes}}',
  selected: 'Selected',
  vote: 'Vote',
  noSynopsis: 'Synopsis unavailable.',
  filmOfTheWeekHeading: 'Film of the Week',
  weeklyVote: "This week's vote",
  votingCloses: 'Voting closes {date}',
  winnerSelected: 'The winner has been selected.',
  openWhatsapp: 'Open WhatsApp discussion',
  selectWinner: 'Select as Film of the Week',
  createVote: "Create this week's vote",
  createHelp:
    'Choose between two and four movies from existing user requests that are already available in Plex. Movies with the most interested users appear first.',
  interestedCount: '{count, plural, one {# interested} other {# interested}}',
  candidateStats: '{interested} int. · {suggestions} sug.',
  whatsappPlaceholder: 'WhatsApp discussion link (optional)',
  startVoting: 'Start voting',
  noActiveVote:
    'No Movie Club vote is active yet. An administrator will select candidates from requested movies available in Plex.',
  edit: 'Edit vote',
  save: 'Save changes',
  saveDraft: 'Save draft',
  cancel: 'Cancel',
  delete: 'Delete vote',
  deleteConfirm:
    'Delete this Movie Club vote, including all votes already submitted?',
  newVote: 'Start a new vote',
  newVoteConfirm:
    'Close the current Movie Club session and start preparing a new vote?',
  updateFailed: 'Unable to update the Movie Club vote.',
  createFailed: 'Unable to start the Movie Club vote.',
  responsibleUsers: 'Responsible users',
  responsibleHelp:
    'Responsible users can edit the candidates and resolve the vote.',
  maximumCandidates: 'You can select a maximum of four movies.',
  resolveResult: 'Resolve result',
  resolveConfirm:
    'Resolve this vote now? A winner will be selected, or a tie-break vote will start for another 24 hours.',
  history: 'Recent Movie Club films',
  noHistory: 'No Movie Club winners have been selected yet.',
  tieExtended:
    'There was a tie. Votes were cleared, one candidate was removed, and voting was extended for 24 hours.',
  prepareVote: 'Prepare this week\'s vote',
  delegatedHelp:
    'The administrator can select the films now, or leave the selection empty and assign a responsible user to choose exactly four films.',
  chooseFour: 'Choose the four films for this week\'s vote.',
  deadline: 'Voting deadline',
  oneWeek: 'One week',
  manualDate: 'Choose date manually',
  openVoting: 'Open voting',
  votingStart: 'Voting start',
  weeklySuggestions: '{count} suggestions this week',
  topTenHelp:
    'Showing this week\'s top 10, prioritizing community suggestions and films with the most interested users.',
  startNow: 'Start immediately',
  scheduledStart: 'Schedule start',
  scheduleVote: 'Schedule voting',
  voteTitle: 'Vote title / theme',
  voteTitlePlaceholder: 'Example: Horror classics, 90s action, hidden gems…',
  manualSearch: 'Add a Movie manually',
  manualSearchPlaceholder: 'Search available Plex movies…',
  manualSearchHelp:
    'Search for a movie already available in Plex and add it to this vote.',
  manualSearchLoading: 'Searching available Plex movies…',
  manualSearchNoResults: 'No available Plex movie matches found.',
  previousWinner:
    'This movie has already won Movie Club. You can still add it if you want.',
});

const poster = (path?: string) =>
  path
    ? `https://image.tmdb.org/t/p/w342${path}`
    : '/images/seerr_poster_not_found.png';

const toLocalInput = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

const oneWeekFromNow = () =>
  toLocalInput(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString());

const oneWeekAfter = (value: string) =>
  toLocalInput(
    new Date(new Date(value).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
  );

const oneHourFromNow = () =>
  toLocalInput(new Date(Date.now() + 60 * 60 * 1000).toISOString());

export const MovieClubHighlight = () => {
  const intl = useIntl();
  const { data } = useSWR<ClubData>('/api/v1/seerrplus/movie-club', {
    refreshInterval: 15000,
  });
  const session = data?.session;
  if (!session || session.status === 3 || session.status === 4) return null;
  const selected = session.candidates.find(
    (candidate) => candidate.id === session.selectedCandidateId
  );
  return (
    <Link
      href="/movie-club"
      className="mb-8 block rounded-lg border border-amber-500/50 bg-gradient-to-r from-amber-950/70 to-gray-900 p-5 shadow-lg transition hover:border-amber-400"
    >
      <div className="flex items-center gap-3 text-amber-300">
        <TrophyIcon className="h-6 w-6" />
        <span className="font-semibold">{intl.formatMessage(messages.title)}</span>
      </div>
      <div className="mt-2 text-xl font-bold text-white">
        {selected
          ? intl.formatMessage(messages.filmOfTheWeek, {
              title: selected.title,
            })
          : intl.formatMessage(messages.voteThisWeek)}
      </div>
      <p className="mt-1 text-sm text-gray-300">
        {selected
          ? intl.formatMessage(messages.highlightSelected)
          : intl.formatMessage(messages.highlightVoting, {
              count: session.candidates.length,
            })}
      </p>
    </Link>
  );
};

const CandidateCard = ({
  candidate,
  selected,
  revealRequesters = false,
  onSelect,
  disabled,
}: {
  candidate: Candidate;
  selected?: boolean;
  revealRequesters?: boolean;
  onSelect?: () => void;
  disabled?: boolean;
}) => {
  const intl = useIntl();
  return (
    <div
      className={`flex flex-1 gap-4 rounded-lg border p-4 ${
        selected
          ? 'border-amber-400 bg-amber-950/30'
          : 'border-gray-700 bg-gray-800/60'
      }`}
    >
      <img
        src={poster(candidate.posterPath)}
        alt=""
        className="h-36 w-24 flex-shrink-0 rounded object-cover"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Link
          href={`/movie/${candidate.tmdbId}`}
          className="font-semibold text-white hover:text-amber-300"
        >
          {candidate.title}{' '}
          {candidate.releaseDate
            ? `(${candidate.releaseDate.slice(0, 4)})`
            : ''}
        </Link>
        <p className="mt-2 line-clamp-4 text-sm leading-5 text-gray-300">
          {candidate.overview || intl.formatMessage(messages.noSynopsis)}
        </p>
        <p className="mt-2 text-xs text-gray-400">
          {revealRequesters && candidate.interestedUsers.length
            ? `${intl.formatMessage(messages.interested)}: ${candidate.interestedUsers
                .map((user) => user.displayName)
                .join(', ')}`
            : intl.formatMessage(messages.interestedCount, {
                count: candidate.interestedUserCount,
              })}{' '}
          · {intl.formatMessage(messages.votes, { count: candidate.votes })}
        </p>
        {onSelect && (
          <div className="mt-auto pt-3">
            <Button
              buttonType={selected ? 'success' : 'primary'}
              buttonSize="sm"
              disabled={disabled}
              onClick={onSelect}
            >
              {intl.formatMessage(
                selected ? messages.selected : messages.vote
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

const MovieClub = () => {
  const intl = useIntl();
  const { hasPermission } = useUser();
  const { data, mutate } = useSWR<ClubData>(
    '/api/v1/seerrplus/movie-club',
    { refreshInterval: 15000 }
  );
  const isAdmin = hasPermission(Permission.ADMIN);
  const session = data?.session;
  const isPreparation = session?.status === 3 || session?.status === 4;
  const canManage = isAdmin || Boolean(session?.canManage);
  const [isEditing, setIsEditing] = useState(false);
  const { data: eligible } = useSWR<{ results: Candidate[] }>(
    canManage && (!session || isEditing)
      ? `/api/v1/seerrplus/movie-club/eligible${
          session ? `?sessionId=${session.id}` : ''
        }`
      : null
  );
  const [manualSearch, setManualSearch] = useState('');
  const { data: manualResults, isValidating: isManualSearchLoading } = useSWR<{
    results: Candidate[];
  }>(
    canManage && manualSearch.trim().length >= 2
      ? `/api/v1/seerrplus/movie-club/search?query=${encodeURIComponent(
          manualSearch.trim()
        )}${session ? `&sessionId=${session.id}` : ''}`
      : null
  );
  const { data: users } = useSWR<{ results: ClubUser[] }>(
    isAdmin && (!session || isEditing)
      ? '/api/v1/seerrplus/movie-club/users'
      : null
  );
  const { data: history, mutate: mutateHistory } = useSWR<{
    results: Session[];
  }>('/api/v1/seerrplus/movie-club/history');
  const [selected, setSelected] = useState<number[]>([]);
  const [curatorUserIds, setCuratorUserIds] = useState<number[]>([]);
  const [closesAt, setClosesAt] = useState(oneWeekFromNow);
  const [deadlineMode, setDeadlineMode] = useState<'week' | 'manual'>('week');
  const [startMode, setStartMode] = useState<'now' | 'scheduled'>('now');
  const [startsAt, setStartsAt] = useState('');
  const [whatsappUrl, setWhatsappUrl] = useState('');
  const [voteTitle, setVoteTitle] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if ((session?.status === 3 || session?.status === 4) && canManage) {
      setIsEditing(true);
    }
  }, [session, canManage]);

  useEffect(() => {
    if (!session && isAdmin) {
      setDeadlineMode('week');
      setClosesAt(oneWeekFromNow());
      setStartMode('now');
      setStartsAt('');
    }
  }, [session, isAdmin]);

  useEffect(() => {
    if (session && isEditing) {
      setSelected(session.candidates.map((candidate) => candidate.mediaId));
      setClosesAt(toLocalInput(session.closesAt));
      setDeadlineMode('manual');
      setStartsAt(toLocalInput(session.startsAt));
      setStartMode(session.startsAt ? 'scheduled' : 'now');
      setWhatsappUrl(session.whatsappUrl ?? '');
      setVoteTitle(session.title ?? '');
      setCuratorUserIds(session.curators.map((curator) => curator.id));
    }
  }, [session, isEditing]);

  const payload = (draft = false) => ({
    mediaIds: selected,
    whatsappUrl,
    title: voteTitle,
    ...(draft ? { draft: true } : {}),
    ...(isAdmin
      ? {
          closesAt: new Date(closesAt).toISOString(),
          curatorUserIds,
          ...(!session || isPreparation
            ? {
                startsAt:
                  draft
                    ? null
                    : startMode === 'scheduled'
                    ? new Date(startsAt).toISOString()
                    : null,
              }
            : {}),
        }
      : {}),
  });

  const createSession = async (draft = false) => {
    try {
      setError('');
      await axios.post('/api/v1/seerrplus/movie-club/sessions', payload(draft));
      setSelected([]);
      setClosesAt(oneWeekFromNow());
      setDeadlineMode('week');
      setStartMode('now');
      setStartsAt('');
      setCuratorUserIds([]);
      setVoteTitle('');
      await mutate();
    } catch (requestError) {
      setError(
        axios.isAxiosError(requestError)
          ? requestError.response?.data?.message ??
              intl.formatMessage(messages.createFailed)
          : intl.formatMessage(messages.createFailed)
      );
    }
  };

  const updateSession = async (draft = false) => {
    if (!session) return;
    try {
      setError('');
      await axios.patch(
        `/api/v1/seerrplus/movie-club/sessions/${session.id}`,
        payload(draft)
      );
      setIsEditing(draft);
      await mutate();
    } catch (requestError) {
      setError(
        axios.isAxiosError(requestError)
          ? requestError.response?.data?.message ??
              intl.formatMessage(messages.updateFailed)
          : intl.formatMessage(messages.updateFailed)
      );
    }
  };

  const vote = async (candidateId: number) => {
    if (!session) return;
    await axios.post(
      `/api/v1/seerrplus/movie-club/sessions/${session.id}/vote`,
      { candidateId }
    );
    await mutate();
  };

  const selectWinner = async (candidateId: number) => {
    if (!session) return;
    await axios.post(
      `/api/v1/seerrplus/movie-club/sessions/${session.id}/select`,
      { candidateId }
    );
    await Promise.all([mutate(), mutateHistory()]);
  };

  const resolveVote = async () => {
    if (
      !session ||
      !window.confirm(intl.formatMessage(messages.resolveConfirm))
    )
      return;
    try {
      setError('');
      const response = await axios.post(
        `/api/v1/seerrplus/movie-club/sessions/${session.id}/resolve`
      );
      if (response.data?.tie) {
        window.alert(intl.formatMessage(messages.tieExtended));
      }
      await Promise.all([mutate(), mutateHistory()]);
    } catch (requestError) {
      setError(
        axios.isAxiosError(requestError)
          ? requestError.response?.data?.message ??
              intl.formatMessage(messages.updateFailed)
          : intl.formatMessage(messages.updateFailed)
      );
    }
  };

  const deleteSession = async () => {
    if (!session || !window.confirm(intl.formatMessage(messages.deleteConfirm)))
      return;
    await axios.delete(
      `/api/v1/seerrplus/movie-club/sessions/${session.id}`
    );
    await Promise.all([mutate(), mutateHistory()]);
  };

  const startNewVote = async () => {
    if (!session || !window.confirm(intl.formatMessage(messages.newVoteConfirm)))
      return;
    await axios.post(
      `/api/v1/seerrplus/movie-club/sessions/${session.id}/close`
    );
    await Promise.all([mutate(), mutateHistory()]);
  };

  if (!data) return null;

  const editor = (
    <div className="rounded-lg border border-gray-700 bg-gray-800/60 p-5">
      <h2 className="text-xl font-semibold text-white">
        {intl.formatMessage(
          isPreparation ? messages.prepareVote : messages.createVote
        )}
      </h2>
      <p className="mt-1 text-sm text-gray-400">
        {intl.formatMessage(
          isPreparation
            ? messages.chooseFour
            : isAdmin && !session
              ? messages.delegatedHelp
              : messages.createHelp
        )}
      </p>
      <p className="mt-1 text-sm text-amber-200">
        {intl.formatMessage(messages.topTenHelp)}
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <input
          className="rounded border border-gray-600 bg-gray-900 px-3 py-2 text-white"
          placeholder={intl.formatMessage(messages.voteTitlePlaceholder)}
          value={voteTitle}
          onChange={(event) => setVoteTitle(event.target.value)}
          aria-label={intl.formatMessage(messages.voteTitle)}
        />
        <input
          className="rounded border border-gray-600 bg-gray-900 px-3 py-2 text-white"
          placeholder={intl.formatMessage(messages.manualSearchPlaceholder)}
          value={manualSearch}
          onChange={(event) => setManualSearch(event.target.value)}
          aria-label={intl.formatMessage(messages.manualSearch)}
        />
      </div>
      <p className="mt-2 text-sm text-gray-400">
        {intl.formatMessage(messages.manualSearchHelp)}
      </p>
      {manualSearch.trim().length >= 2 && isManualSearchLoading && (
        <p className="mt-3 text-sm text-gray-400">
          {intl.formatMessage(messages.manualSearchLoading)}
        </p>
      )}
      {manualResults?.results.length ? (
        <div className="mt-4 rounded border border-gray-700 bg-gray-900/60 p-3">
          <h3 className="mb-2 font-semibold text-white">
            {intl.formatMessage(messages.manualSearch)}
          </h3>
          <div className="grid gap-3 lg:grid-cols-2">
            {manualResults.results.map((candidate) => (
              <label
                key={`manual-${candidate.mediaId}`}
                className="flex cursor-pointer items-start gap-3 rounded border border-gray-700 p-3 text-white"
              >
                <input
                  className="mt-1 shrink-0"
                  type="checkbox"
                  checked={selected.includes(candidate.mediaId)}
                  disabled={
                    !selected.includes(candidate.mediaId) &&
                    selected.length >= 4
                  }
                  onChange={() => {
                    if (
                      !selected.includes(candidate.mediaId) &&
                      candidate.hasWonMovieClub
                    ) {
                      window.alert(intl.formatMessage(messages.previousWinner));
                    }
                    setSelected((current) =>
                      current.includes(candidate.mediaId)
                        ? current.filter((id) => id !== candidate.mediaId)
                        : [...current, candidate.mediaId]
                    );
                  }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold leading-tight">
                    {candidate.title}
                  </span>
                  {candidate.hasWonMovieClub && (
                    <span className="mt-1 block text-xs text-amber-300">
                      🏆 Movie Club
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
        </div>
      ) : manualSearch.trim().length >= 2 && !isManualSearchLoading ? (
        <p className="mt-3 rounded border border-gray-700 bg-gray-900/60 p-3 text-sm text-gray-400">
          {intl.formatMessage(messages.manualSearchNoResults)}
        </p>
      ) : null}
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {eligible?.results.map((candidate) => (
          <label
            key={candidate.mediaId}
            className="flex cursor-pointer items-start gap-3 rounded border border-gray-700 p-3 text-white"
          >
            <input
              className="mt-1 shrink-0"
              type="checkbox"
              checked={selected.includes(candidate.mediaId)}
              disabled={
                !selected.includes(candidate.mediaId) && selected.length >= 4
              }
              onChange={() => {
                if (
                  !selected.includes(candidate.mediaId) &&
                  candidate.hasWonMovieClub
                ) {
                  window.alert(intl.formatMessage(messages.previousWinner));
                }
                setSelected((current) =>
                  current.includes(candidate.mediaId)
                    ? current.filter((id) => id !== candidate.mediaId)
                    : [...current, candidate.mediaId]
                );
              }}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold leading-tight">
                {candidate.title}
              </span>
              <span className="mt-1 block text-xs text-gray-400">
                {intl.formatMessage(messages.candidateStats, {
                  interested: candidate.interestedUserCount,
                  suggestions: candidate.weeklySuggestions ?? 0,
                })}
              </span>
            </span>
          </label>
        ))}
      </div>
      {selected.length >= 4 && (
        <p className="mt-2 text-sm text-amber-300">
          {intl.formatMessage(messages.maximumCandidates)}
        </p>
      )}
      {isAdmin && users?.results && (
        <div className="mt-5">
          <h3 className="font-semibold text-white">
            {intl.formatMessage(messages.responsibleUsers)}
          </h3>
          <p className="mb-3 text-sm text-gray-400">
            {intl.formatMessage(messages.responsibleHelp)}
          </p>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {users.results.map((user) => (
              <label
                key={user.id}
                className="flex cursor-pointer items-center gap-2 rounded border border-gray-700 px-3 py-2 text-sm text-white"
              >
                <input
                  type="checkbox"
                  checked={curatorUserIds.includes(user.id)}
                  onChange={() =>
                    setCuratorUserIds((current) =>
                      current.includes(user.id)
                        ? current.filter((id) => id !== user.id)
                        : [...current, user.id]
                    )
                  }
                />
                {user.displayName}
              </label>
            ))}
          </div>
        </div>
      )}
      {isAdmin && (
        <div className="mt-5">
          <label className="mb-1 block text-sm text-gray-300">
            {intl.formatMessage(messages.votingStart)}
          </label>
          <select
            className="w-full rounded border border-gray-600 bg-gray-900 px-3 py-2 text-white md:w-1/2"
            value={startMode}
            onChange={(event) => {
              const mode = event.target.value as 'now' | 'scheduled';
              setStartMode(mode);
              if (mode === 'scheduled') {
                const scheduled = startsAt || oneHourFromNow();
                setStartsAt(scheduled);
                if (deadlineMode === 'week') {
                  setClosesAt(oneWeekAfter(scheduled));
                }
              } else {
                setStartsAt('');
                if (deadlineMode === 'week') setClosesAt(oneWeekFromNow());
              }
            }}
          >
            <option value="now">{intl.formatMessage(messages.startNow)}</option>
            <option value="scheduled">
              {intl.formatMessage(messages.scheduledStart)}
            </option>
          </select>
          {startMode === 'scheduled' && (
            <input
              className="mt-2 w-full rounded border border-gray-600 bg-gray-900 px-3 py-2 text-white md:w-1/2"
              type="datetime-local"
              value={startsAt}
              onChange={(event) => {
                setStartsAt(event.target.value);
                if (deadlineMode === 'week' && event.target.value) {
                  setClosesAt(oneWeekAfter(event.target.value));
                }
              }}
            />
          )}
        </div>
      )}
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm text-gray-300">
            {intl.formatMessage(messages.deadline)}
          </label>
          {isAdmin && (
            <select
              className="mb-2 w-full rounded border border-gray-600 bg-gray-900 px-3 py-2 text-white"
              value={deadlineMode}
              onChange={(event) => {
                const mode = event.target.value as 'week' | 'manual';
                setDeadlineMode(mode);
                if (mode === 'week') {
                  setClosesAt(
                    startMode === 'scheduled' && startsAt
                      ? oneWeekAfter(startsAt)
                      : oneWeekFromNow()
                  );
                }
              }}
            >
              <option value="week">{intl.formatMessage(messages.oneWeek)}</option>
              <option value="manual">
                {intl.formatMessage(messages.manualDate)}
              </option>
            </select>
          )}
          <input
            className="w-full rounded border border-gray-600 bg-gray-900 px-3 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
            type="datetime-local"
            value={closesAt}
            disabled={!isAdmin || deadlineMode === 'week'}
            onChange={(event) => setClosesAt(event.target.value)}
          />
        </div>
        <input
          className="self-end rounded border border-gray-600 bg-gray-900 px-3 py-2 text-white"
          placeholder={intl.formatMessage(messages.whatsappPlaceholder)}
          value={whatsappUrl}
          onChange={(event) => setWhatsappUrl(event.target.value)}
        />
      </div>
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          buttonType="primary"
          disabled={
            !closesAt ||
            (startMode === 'scheduled' && !startsAt) ||
            (isPreparation
              ? selected.length !== 4
              : session
                ? selected.length < 2 || selected.length > 4
                : !(
                    (selected.length === 0 && curatorUserIds.length > 0) ||
                    (selected.length >= 2 && selected.length <= 4)
                  ))
          }
          onClick={() =>
            session ? updateSession(false) : createSession(false)
          }
        >
          {intl.formatMessage(
            isPreparation
              ? startMode === 'scheduled'
                ? messages.scheduleVote
                : messages.openVoting
              : session
                ? messages.save
                : selected.length === 0
                  ? messages.prepareVote
                  : startMode === 'scheduled'
                    ? messages.scheduleVote
                    : messages.startVoting
          )}
        </Button>
        {canManage && (isPreparation || !session) && (
          <Button
            buttonType="ghost"
            disabled={!closesAt}
            onClick={() =>
              session ? updateSession(true) : createSession(true)
            }
          >
            {intl.formatMessage(messages.saveDraft)}
          </Button>
        )}
        {session && !isPreparation && (
          <Button buttonType="ghost" onClick={() => setIsEditing(false)}>
            {intl.formatMessage(messages.cancel)}
          </Button>
        )}
        {session && isAdmin && (
          <Button buttonType="danger" onClick={deleteSession}>
            {intl.formatMessage(messages.delete)}
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <PageTitle title={intl.formatMessage(messages.title)} />
      <div className="mb-6 rounded-lg border border-amber-500/50 bg-gradient-to-r from-amber-950/70 to-gray-900 p-6">
        <div className="flex items-center gap-3">
          <TrophyIcon className="h-8 w-8 text-amber-300" />
          <div>
            <h1 className="text-2xl font-bold text-white">
              {intl.formatMessage(messages.title)}
            </h1>
            <p className="text-gray-300">
              {intl.formatMessage(messages.description)}
            </p>
          </div>
        </div>
      </div>

      {session && !isPreparation && !isEditing ? (
        <div>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-white">
                {session.title ||
                  intl.formatMessage(
                    session.status === 1
                      ? messages.filmOfTheWeekHeading
                      : messages.weeklyVote
                  )}
              </h2>
              <p className="text-sm text-gray-400">
                {session.status === 0
                  ? intl.formatMessage(messages.votingCloses, {
                      date: new Date(session.closesAt).toLocaleString(),
                    })
                  : intl.formatMessage(messages.winnerSelected)}{' '}
                · {intl.formatMessage(messages.votes, { count: session.totalVotes })}
              </p>
              {session.curators.length > 0 && (
                <p className="mt-1 text-sm text-amber-200">
                  {intl.formatMessage(messages.responsibleUsers)}:{' '}
                  {session.curators
                    .map((curator) => curator.displayName)
                    .join(', ')}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {session.whatsappUrl && session.status === 1 && (
                <Button
                  as="a"
                  href={session.whatsappUrl}
                  target="_blank"
                  buttonType="success"
                >
                  <ChatBubbleLeftRightIcon />
                  {intl.formatMessage(messages.openWhatsapp)}
                </Button>
              )}
              {canManage && (
                <>
                  <Button buttonType="ghost" onClick={() => setIsEditing(true)}>
                    {intl.formatMessage(messages.edit)}
                  </Button>
                  {isAdmin && (
                    <>
                      <Button buttonType="primary" onClick={startNewVote}>
                        {intl.formatMessage(messages.newVote)}
                      </Button>
                      <Button buttonType="danger" onClick={deleteSession}>
                        {intl.formatMessage(messages.delete)}
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
          {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
          <div className="grid items-stretch gap-4 lg:grid-cols-2">
            {session.candidates.map((candidate) => (
              <div key={candidate.id} className="flex h-full flex-col">
                <CandidateCard
                  candidate={candidate}
                  selected={
                    candidate.id === session.selectedCandidateId ||
                    candidate.id === session.myVoteCandidateId
                  }
                  revealRequesters={
                    session.status === 1 &&
                    candidate.id === session.selectedCandidateId
                  }
                  disabled={session.status !== 0}
                  onSelect={
                    session.status === 0 ? () => vote(candidate.id) : undefined
                  }
                />
                {isAdmin && session.status === 0 && (
                  <Button
                    buttonType="ghost"
                    buttonSize="sm"
                    className="mt-2"
                    onClick={() => selectWinner(candidate.id)}
                  >
                    {intl.formatMessage(messages.selectWinner)}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : canManage ? (
        editor
      ) : (
        <div className="rounded-lg border border-gray-700 bg-gray-800/60 p-6 text-gray-300">
          {intl.formatMessage(messages.noActiveVote)}
        </div>
      )}

      <section className="mt-10">
        <h2 className="mb-4 text-xl font-semibold text-white">
          {intl.formatMessage(messages.history)}
        </h2>
        {history?.results.length ? (
          <div className="grid items-stretch gap-4 lg:grid-cols-2">
            {history.results.map((historicSession) => {
              const winner = historicSession.candidates.find(
                (candidate) =>
                  candidate.id === historicSession.selectedCandidateId
              );
              return winner ? (
                <CandidateCard
                  key={historicSession.id}
                  candidate={winner}
                  selected
                  revealRequesters
                />
              ) : (
                <div
                  key={historicSession.id}
                  className="rounded-lg border border-gray-700 bg-gray-800/60 p-4 text-gray-400"
                >
                  {intl.formatMessage(messages.noHistory)}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-400">
            {intl.formatMessage(messages.noHistory)}
          </p>
        )}
      </section>
    </>
  );
};

export default MovieClub;
