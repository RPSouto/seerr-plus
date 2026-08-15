import Button from '@app/components/Common/Button';
import CachedImage from '@app/components/Common/CachedImage';
import useToasts from '@app/hooks/useToasts';
import { Permission, useUser } from '@app/hooks/useUser';
import defineMessages from '@app/utils/defineMessages';
import {
  ChevronDownIcon,
  UsersIcon,
  XMarkIcon,
} from '@heroicons/react/24/solid';
import axios from 'axios';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import useSWR from 'swr';

type ParticipantUser = {
  id: number;
  displayName: string;
  avatar: string;
  createdAt: string;
};

type ParticipantsResponse = {
  requestId: number;
  requestedBy: Omit<ParticipantUser, 'createdAt'>;
  users: ParticipantUser[];
};

export const messages = defineMessages(
  'components.SeerrPlus.RequestParticipants',
  {
    interestedusers: 'Interested Users',
    nointerestedusers:
      'No interested users remain. This request can now be deleted.',
    removeinterest: 'Remove Interest',
    removeinterestconfirm: "Remove this user's interest from the request?",
    removefailed: 'Unable to remove this user from the request.',
    manageinterestedusers: 'Manage interested users ({count})',
    interestedusercount: '{count} interested users',
  }
);

type RequestParticipantsProps = {
  requestId: number;
  onParticipantCountChange?: (count: number) => void;
  displayMode?: 'default' | 'countOnly';
};

const RequestParticipants = ({
  requestId,
  onParticipantCountChange,
  displayMode = 'default',
}: RequestParticipantsProps) => {
  const intl = useIntl();
  const { user: currentUser, hasPermission } = useUser();
  const { addToast } = useToasts();
  const [removingUserId, setRemovingUserId] = useState<number>();
  const [isExpanded, setIsExpanded] = useState(false);
  const { data, mutate } = useSWR<ParticipantsResponse>(
    `/api/v1/seerrplus/requests/${requestId}/users`
  );
  const users = data?.users ?? [];
  const canManage = hasPermission(
    [Permission.MANAGE_REQUESTS, Permission.MANAGE_USERS],
    { type: 'or' }
  );

  useEffect(() => {
    if (data) {
      onParticipantCountChange?.(users.length);
    }
  }, [data, onParticipantCountChange, users.length]);

  const removeInterest = async (userId: number): Promise<void> => {
    if (!window.confirm(intl.formatMessage(messages.removeinterestconfirm))) {
      return;
    }

    setRemovingUserId(userId);
    try {
      await axios.delete(
        `/api/v1/seerrplus/requests/${requestId}/users/${userId}`
      );
      await mutate();
    } catch {
      addToast(intl.formatMessage(messages.removefailed), {
        appearance: 'error',
        autoDismiss: true,
      });
    } finally {
      setRemovingUserId(undefined);
    }
  };

  if (!data) {
    return null;
  }

  if (displayMode === 'countOnly') {
    return null;
  }

  if (users.length === 0) {
    return (
      <div className="rounded-md border border-amber-500/50 bg-amber-900/30 px-3 py-2 text-sm font-medium text-amber-200">
        {intl.formatMessage(messages.nointerestedusers)}
      </div>
    );
  }

  return (
    <div className="text-sm">
      <button
        type="button"
        className="flex w-full items-center rounded-md border border-gray-600 bg-gray-800/70 px-3 py-2 text-left font-medium text-gray-200 transition hover:border-gray-500 hover:bg-gray-700/80"
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded((expanded) => !expanded)}
      >
        <UsersIcon className="mr-2 h-5 w-5 flex-shrink-0" />
        <span className="min-w-0 flex-1 truncate">
          {intl.formatMessage(
            canManage
              ? messages.manageinterestedusers
              : messages.interestedusercount,
            { count: users.length }
          )}
        </span>
        <ChevronDownIcon
          className={`ml-2 h-4 w-4 flex-shrink-0 transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>
      {isExpanded && (
        <div className="mt-2 max-h-64 space-y-2 overflow-y-auto rounded-md border border-gray-700 bg-gray-900/60 p-2">
          {users.map((participant) => (
            <div
              key={participant.id}
              className="flex min-w-0 items-center justify-between gap-2 rounded px-2 py-1 hover:bg-gray-800"
            >
              <Link
                href={
                  participant.id === currentUser?.id
                    ? '/profile'
                    : `/users/${participant.id}`
                }
                className="flex min-w-0 items-center font-semibold text-gray-100 transition duration-300 hover:text-white hover:underline"
              >
                <span className="avatar-sm mr-2 flex-shrink-0">
                  <CachedImage
                    type="avatar"
                    src={participant.avatar}
                    alt=""
                    className="avatar-sm object-cover"
                    width={20}
                    height={20}
                  />
                </span>
                <span className="truncate">{participant.displayName}</span>
              </Link>
              {(participant.id === currentUser?.id || canManage) && (
                <Button
                  buttonType="danger"
                  buttonSize="sm"
                  className="ml-1 flex-shrink-0 !p-1"
                  disabled={removingUserId !== undefined}
                  onClick={() => removeInterest(participant.id)}
                  aria-label={intl.formatMessage(messages.removeinterest)}
                >
                  <XMarkIcon className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RequestParticipants;
