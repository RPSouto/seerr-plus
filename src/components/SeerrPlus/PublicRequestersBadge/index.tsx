import Badge from '@app/components/Common/Badge';
import { useUser } from '@app/hooks/useUser';
import Link from 'next/link';
import useSWR from 'swr';

type PublicRequester = {
  id: number;
  displayName: string;
  avatar: string;
};

type PublicRequestersResponse = {
  mediaId: number;
  users: PublicRequester[];
};

const PublicRequestersBadge = ({
  mediaId,
  visible,
}: {
  mediaId?: number;
  visible: boolean;
}) => {
  const { user: currentUser } = useUser();
  const { data } = useSWR<PublicRequestersResponse>(
    visible && mediaId
      ? `/api/v1/seerrplus/media/${mediaId}/public-requesters`
      : null
  );
  const users = data?.users ?? [];

  if (!visible || !mediaId || users.length === 0) {
    return null;
  }

  const requester = users[0];

  return (
    <span className="flex basis-full justify-center xl:basis-auto xl:justify-start">
      <Badge
        badgeType="success"
        className="!h-5 !w-[4.25rem] items-center justify-center overflow-hidden !px-2 !py-0"
      >
        <span className="flex min-w-0 items-center gap-1">
          <Link
            href={
              requester.id === currentUser?.id
                ? '/profile'
                : `/users/${requester.id}`
            }
            className="min-w-0 truncate font-semibold transition hover:text-white hover:underline"
            title={requester.displayName}
          >
            {requester.displayName}
          </Link>
        </span>
      </Badge>
    </span>
  );
};

export default PublicRequestersBadge;
