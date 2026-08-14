import Button from '@app/components/Common/Button';
import CachedImage from '@app/components/Common/CachedImage';
import useToasts from '@app/hooks/useToasts';
import { Permission, useUser } from '@app/hooks/useUser';
import defineMessages from '@app/utils/defineMessages';
import { UsersIcon, XMarkIcon } from '@heroicons/react/24/solid';
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

const messages = defineMessages('components.SeerrPlus.RequestParticipants', {
  interestedusers: 'Interested Users',
  nointerestedusers:
    'No interested users remain. This request can now be deleted.',
  removeinterest: 'Remove Interest',
  removeinterestconfirm: "Remove this user's interest from the request?",
  removefailed: 'Unable to remove this user from the request.',
});

type RequestParticipantsProps = {
  requestId: number;
  onParticipantCountChange?: (count: number) => void;
};

const RequestParticipants = ({
  requestId,
  onParticipantCountChange,
}: RequestParticipantsProps) => {
  const intl = useIntl();
  const { user: currentUser, hasPermission } = useUser();
  const { addToast } = useToasts();
  const [removingUserId, setRemovingUserId] = useState<number>();
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

  if (users.length === 0) {
    return (
      <div className="mt-2 rounded-md border border-amber-500/50 bg-amber-900/30 px-3 py-2 text-sm font-medium text-amber-200">
        {intl.formatMessage(messages.nointerestedusers)}
      </div>
    );
  }

  return (
    <div className="mt-1 flex flex-nowrap text-sm">
      <span className="flex min-w-0 items-center">
        <UsersIcon className="mr-1.5 h-5 w-5 flex-shrink-0" />
        <span className="mr-2 text-gray-400">
          {intl.formatMessage(messages.interestedusers)}:
        </span>
        <span className="flex min-w-0 flex-wrap gap-1.5">
          {users.map((participant) => (
            <span key={participant.id} className="flex items-center">
              <Link
                href={
                  participant.id === currentUser?.id
                    ? '/profile'
                    : `/users/${participant.id}`
                }
                className="flex items-center font-semibold text-gray-100 transition duration-300 hover:text-white hover:underline"
              >
                <span className="avatar-sm mr-1">
                  <CachedImage
                    type="avatar"
                    src={participant.avatar}
                    alt=""
                    className="avatar-sm object-cover"
                    width={20}
                    height={20}
                  />
                </span>
                {participant.displayName}
              </Link>
              {(participant.id === currentUser?.id || canManage) && (
                <Button
                  buttonType="danger"
                  buttonSize="sm"
                  className="ml-1 !p-1"
                  disabled={removingUserId !== undefined}
                  onClick={() => removeInterest(participant.id)}
                  aria-label={intl.formatMessage(messages.removeinterest)}
                >
                  <XMarkIcon className="h-3.5 w-3.5" />
                </Button>
              )}
            </span>
          ))}
        </span>
      </span>
    </div>
  );
};

export default RequestParticipants;
