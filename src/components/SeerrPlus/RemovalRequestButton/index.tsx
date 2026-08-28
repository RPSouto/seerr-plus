import Button from '@app/components/Common/Button';
import Modal from '@app/components/Common/Modal';
import Tooltip from '@app/components/Common/Tooltip';
import useToasts from '@app/hooks/useToasts';
import { useUser } from '@app/hooks/useUser';
import defineMessages from '@app/utils/defineMessages';
import { Transition } from '@headlessui/react';
import { TrashIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { useIntl } from 'react-intl';

const messages = defineMessages('components.SeerrPlus.RemovalRequestButton', {
  requestRemoval: 'Request Content Removal',
  removeOrRequest: 'Remove / Request Removal',
  removalVote: 'Removal Vote',
  startVote: 'Start Removal Vote',
  voteStarted: 'Removal vote started. Users were notified.',
  voteAgree: 'Agree to Remove',
  voteKeep: 'Keep It',
  voteSaved: 'Your removal vote was saved.',
  voteSummary: '{agree} agree · {keep} keep · {total}/{interested} voted',
  voteRequestedBy: 'Requested by {user}',
  activeVoteHelp:
    'Invited users can vote before the administrator makes the final decision.',
  audience: 'Send vote to',
  audienceInterested: 'Interested users',
  audienceSelected: 'Selected users',
  audienceAll: 'All users',
  selectedUsers: 'Selected users',
  noUsersSelected: 'Select at least one user.',
  adminApproval: 'An administrator must approve before anything is removed.',
  edition: 'Edition',
  standard: 'Standard',
  reason: 'Reason',
  freeSpace: 'Free Up Storage Space',
  noInterest: 'Content No Longer Has Interest',
  otherReason: 'Other Reason',
  additionalDetails: 'Additional Details (Optional)',
  sendRequest: 'Send Request',
  requestSent: 'Removal request sent to the administrators.',
  requestFailed: 'Unable to send removal request.',
  destructiveWarning:
    'Approval removes the title and its files from Radarr or Sonarr.',
});

interface RemovalRequestButtonProps {
  mediaId?: number;
  mediaTitle?: string;
  available: boolean;
  available4k?: boolean;
  managed: boolean;
  managed4k?: boolean;
}

interface RequestersResponse {
  requesters: { id: number }[];
  requesters4k: { id: number }[];
  isAdmin: boolean;
  canRequestRemoval: boolean;
  canRequestRemoval4k: boolean;
}

interface RemovalVoteResponse {
  session?: {
    id: number;
    reason?: string;
    message?: string;
    createdBy: { id: number; displayName: string };
    canVote: boolean;
    myVote?: number;
    totals: {
      agree: number;
      keep: number;
      total: number;
      interested: number;
    };
  } | null;
  canStart: boolean;
  canAdminRemove: boolean;
}

interface UsersResponse {
  results: { id: number; displayName: string }[];
}

const RemovalRequestButton = ({
  mediaId,
  mediaTitle,
  available,
  available4k = false,
  managed,
  managed4k = false,
}: RemovalRequestButtonProps) => {
  const { user } = useUser();
  const intl = useIntl();
  const { addToast } = useToasts();
  const [show, setShow] = useState(false);
  const [reason, setReason] = useState('free_space');
  const [message, setMessage] = useState('');
  const [is4k, setIs4k] = useState(!available && available4k);
  const [audience, setAudience] = useState<'interested' | 'selected' | 'all'>(
    'interested'
  );
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const { data } = useSWR<RequestersResponse>(
    mediaId ? `/api/v1/seerrplus/media/${mediaId}/requesters` : null
  );
  const { data: voteData, mutate: revalidateVote } =
    useSWR<RemovalVoteResponse>(
      mediaId
        ? `/api/v1/seerrplus/media/${mediaId}/removal-vote?is4k=${is4k}`
        : null
    );
  const { data: usersData } = useSWR<UsersResponse>(
    data?.isAdmin ? '/api/v1/seerrplus/movie-club/users' : null
  );

  const isAdmin = data?.isAdmin ?? false;
  const canRemoveStandard =
    (isAdmin && managed) ||
    (available &&
      (data?.canRequestRemoval ??
        data?.requesters.some(({ id }) => id === user?.id) ??
        false));
  const canRemove4k =
    (isAdmin && managed4k) ||
    (available4k &&
      (data?.canRequestRemoval4k ??
        data?.requesters4k?.some(({ id }) => id === user?.id) ??
        false));
  const canOpenActiveVote =
    Boolean(voteData?.session) &&
    (Boolean(voteData?.session?.canVote) || isAdmin);

  useEffect(() => {
    if (!canRemoveStandard && canRemove4k) {
      setIs4k(true);
    } else if (canRemoveStandard && !canRemove4k) {
      setIs4k(false);
    }
  }, [canRemove4k, canRemoveStandard]);

  if (
    !mediaId ||
    !data ||
    (!canRemoveStandard && !canRemove4k && !canOpenActiveVote)
  ) {
    return null;
  }

  const submit = async () => {
    setLoading(true);
    try {
      if (isAdmin) {
        await axios.post(`/api/v1/seerrplus/media/${mediaId}/removal-votes`, {
          reason,
          message,
          is4k,
          audience,
          userIds: audience === 'selected' ? selectedUserIds : [],
          mediaTitle,
        });
        await revalidateVote();
      } else {
        await axios.post(`/api/v1/seerrplus/media/${mediaId}/removal-requests`, {
          reason,
          message,
          is4k,
          mediaTitle,
        });
      }
      addToast(intl.formatMessage(isAdmin ? messages.voteStarted : messages.requestSent), {
        appearance: 'success',
        autoDismiss: true,
      });
      setShow(false);
    } catch (error) {
      addToast(
        axios.isAxiosError(error)
          ? error.response?.data?.message ??
            intl.formatMessage(messages.requestFailed)
          : intl.formatMessage(messages.requestFailed),
        { appearance: 'error', autoDismiss: true }
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectedUser = (userId: number) => {
    setSelectedUserIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId]
    );
  };

  const castVote = async (vote: 'agree' | 'keep') => {
    if (!voteData?.session) {
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `/api/v1/seerrplus/removal-votes/${voteData.session.id}/vote`,
        { vote }
      );
      await revalidateVote();
      addToast(intl.formatMessage(messages.voteSaved), {
        appearance: 'success',
        autoDismiss: true,
      });
    } catch (error) {
      addToast(
        axios.isAxiosError(error)
          ? error.response?.data?.message ??
            intl.formatMessage(messages.requestFailed)
          : intl.formatMessage(messages.requestFailed),
        { appearance: 'error', autoDismiss: true }
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Tooltip
        content={intl.formatMessage(
          voteData?.session ? messages.removalVote : messages.requestRemoval
        )}
      >
        <Button
          buttonType={voteData?.session ? 'warning' : 'danger'}
          className="ml-2 first:ml-0"
          onClick={() => setShow(true)}
        >
          <TrashIcon />
        </Button>
      </Tooltip>
      <Transition show={show}>
        <Modal
          title={intl.formatMessage(
            voteData?.session ? messages.removalVote : messages.requestRemoval
          )}
          subTitle={intl.formatMessage(
            voteData?.session ? messages.activeVoteHelp : messages.adminApproval
          )}
          onCancel={() => setShow(false)}
          onOk={voteData?.session ? undefined : submit}
          okText={intl.formatMessage(
            isAdmin ? messages.startVote : messages.sendRequest
          )}
          okButtonType="danger"
          okDisabled={
            (isAdmin && Boolean(voteData?.session)) ||
            (isAdmin && !voteData?.canStart) ||
            (isAdmin && audience === 'selected' && selectedUserIds.length === 0)
          }
          loading={loading}
        >
          <div className="space-y-4">
            {voteData?.session && (
              <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm text-yellow-100">
                <div className="font-semibold">
                  {intl.formatMessage(messages.removalVote)}
                </div>
                <div className="mt-1 text-yellow-200/90">
                  {intl.formatMessage(messages.voteRequestedBy, {
                    user: voteData.session.createdBy.displayName,
                  })}
                </div>
                <div className="mt-2">
                  {intl.formatMessage(messages.voteSummary, {
                    agree: voteData.session.totals.agree,
                    keep: voteData.session.totals.keep,
                    total: voteData.session.totals.total,
                    interested: voteData.session.totals.interested,
                  })}
                </div>
                <p className="mt-2 text-yellow-200/80">
                  {intl.formatMessage(messages.activeVoteHelp)}
                </p>
                {voteData.session.canVote && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      buttonType={
                        voteData.session.myVote === 1 ? 'danger' : 'ghost'
                      }
                      disabled={loading}
                      onClick={() => castVote('agree')}
                    >
                      {intl.formatMessage(messages.voteAgree)}
                    </Button>
                    <Button
                      buttonType={
                        voteData.session.myVote === 2 ? 'success' : 'ghost'
                      }
                      disabled={loading}
                      onClick={() => castVote('keep')}
                    >
                      {intl.formatMessage(messages.voteKeep)}
                    </Button>
                  </div>
                )}
              </div>
            )}
            {!voteData?.session && (
              <>
                {isAdmin && (
                  <div>
                <label className="text-label" htmlFor="removal-audience">
                  {intl.formatMessage(messages.audience)}
                </label>
                <select
                  id="removal-audience"
                  value={audience}
                  onChange={(event) =>
                    setAudience(
                      event.target.value as 'interested' | 'selected' | 'all'
                    )
                  }
                >
                  <option value="interested">
                    {intl.formatMessage(messages.audienceInterested)}
                  </option>
                  <option value="selected">
                    {intl.formatMessage(messages.audienceSelected)}
                  </option>
                  <option value="all">
                    {intl.formatMessage(messages.audienceAll)}
                  </option>
                </select>
                {audience === 'selected' && (
                  <div className="mt-3 rounded-md border border-gray-700 bg-gray-900/40 p-3">
                    <div className="mb-2 text-sm font-semibold text-gray-200">
                      {intl.formatMessage(messages.selectedUsers)}
                    </div>
                    <div className="grid max-h-48 gap-2 overflow-y-auto sm:grid-cols-2">
                      {usersData?.results.map((availableUser) => (
                        <label
                          key={availableUser.id}
                          className="flex items-center gap-2 text-sm text-gray-200"
                        >
                          <input
                            type="checkbox"
                            checked={selectedUserIds.includes(
                              availableUser.id
                            )}
                            onChange={() =>
                              toggleSelectedUser(availableUser.id)
                            }
                          />
                          <span className="truncate">
                            {availableUser.displayName}
                          </span>
                        </label>
                      ))}
                    </div>
                    {selectedUserIds.length === 0 && (
                      <p className="mt-2 text-xs text-yellow-300">
                        {intl.formatMessage(messages.noUsersSelected)}
                      </p>
                    )}
                  </div>
                )}
              </div>
                )}
                {canRemoveStandard && canRemove4k && (
                  <div>
                <label className="text-label" htmlFor="removal-edition">
                  {intl.formatMessage(messages.edition)}
                </label>
                <select
                  id="removal-edition"
                  value={is4k ? '4k' : 'standard'}
                  onChange={(event) => setIs4k(event.target.value === '4k')}
                >
                  <option value="standard">
                    {intl.formatMessage(messages.standard)}
                  </option>
                  <option value="4k">4K</option>
                </select>
              </div>
                )}
                <div>
              <label className="text-label" htmlFor="removal-reason">
                {intl.formatMessage(messages.reason)}
              </label>
              <select
                id="removal-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              >
                <option value="free_space">
                  {intl.formatMessage(messages.freeSpace)}
                </option>
                <option value="no_interest">
                  {intl.formatMessage(messages.noInterest)}
                </option>
                <option value="other">
                  {intl.formatMessage(messages.otherReason)}
                </option>
              </select>
            </div>
                <div>
              <label className="text-label" htmlFor="removal-message">
                {intl.formatMessage(messages.additionalDetails)}
              </label>
              <textarea
                id="removal-message"
                className="h-24"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
            </div>
                <div className="rounded-md bg-yellow-500/10 p-3 text-sm text-yellow-200">
              {intl.formatMessage(messages.destructiveWarning)}
            </div>
              </>
            )}
          </div>
        </Modal>
      </Transition>
    </>
  );
};

export default RemovalRequestButton;
