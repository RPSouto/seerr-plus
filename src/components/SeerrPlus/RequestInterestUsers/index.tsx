import CachedImage from '@app/components/Common/CachedImage';
import { useUser } from '@app/hooks/useUser';
import defineMessages from '@app/utils/defineMessages';
import { UsersIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import useSWR from 'swr';

type InterestUser = {
  id: number;
  displayName: string;
  avatar: string;
};

type RequestParticipantsResponse = {
  users: InterestUser[];
};

const messages = defineMessages('components.SeerrPlus.RequestInterestUsers', {
  interested: 'Interested',
  andmore: 'and {count} more',
  showless: 'Show less',
});

const RequestInterestUsers = ({
  requestId,
  mediaId,
}: {
  requestId?: number;
  mediaId?: number;
}) => {
  const intl = useIntl();
  const { user: currentUser } = useUser();
  const [isExpanded, setIsExpanded] = useState(false);
  const { data } = useSWR<RequestParticipantsResponse>(
    mediaId
      ? `/api/v1/seerrplus/media/${mediaId}/interests`
      : requestId
        ? `/api/v1/seerrplus/requests/${requestId}/users`
        : null
  );
  const interestedUsers = data?.users ?? [];

  if ((!requestId && !mediaId) || !interestedUsers.length) {
    return null;
  }

  const visibleUsers = isExpanded
    ? interestedUsers
    : interestedUsers.slice(0, 3);
  const remainingUsers = interestedUsers.length - visibleUsers.length;

  return (
    <div className="ml-3 flex min-w-0 max-w-full flex-wrap items-center gap-2 rounded-md bg-gray-800/80 px-3 py-2 text-sm ring-1 ring-gray-700 xl:ml-3">
      <span className="flex items-center font-medium text-gray-300">
        <UsersIcon className="mr-1.5 h-5 w-5" />
        {intl.formatMessage(messages.interested)}:
      </span>
      <span className="flex flex-wrap items-center gap-2">
        {visibleUsers.map((interestUser) => (
          <Link
            key={interestUser.id}
            href={
              interestUser.id === currentUser?.id
                ? '/profile'
                : `/users/${interestUser.id}`
            }
            className="flex items-center font-semibold text-gray-100 transition hover:text-white hover:underline"
            title={interestUser.displayName}
          >
            <span className="avatar-sm mr-1">
              <CachedImage
                type="avatar"
                src={interestUser.avatar}
                alt=""
                className="avatar-sm object-cover"
                width={20}
                height={20}
              />
            </span>
            {interestUser.displayName}
          </Link>
        ))}
        {remainingUsers > 0 && (
          <button
            type="button"
            className="whitespace-nowrap font-semibold text-amber-300 transition hover:text-amber-200 hover:underline"
            onClick={() => setIsExpanded(true)}
          >
            {intl.formatMessage(messages.andmore, { count: remainingUsers })}
          </button>
        )}
        {isExpanded && interestedUsers.length > 3 && (
          <button
            type="button"
            className="whitespace-nowrap text-gray-400 transition hover:text-white hover:underline"
            onClick={() => setIsExpanded(false)}
          >
            {intl.formatMessage(messages.showless)}
          </button>
        )}
      </span>
    </div>
  );
};

export default RequestInterestUsers;
