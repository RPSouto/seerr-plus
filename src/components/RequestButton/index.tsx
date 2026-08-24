import ButtonWithDropdown from '@app/components/Common/ButtonWithDropdown';
import RequestModal from '@app/components/RequestModal';
import useSettings from '@app/hooks/useSettings';
import useToasts from '@app/hooks/useToasts';
import { Permission, useUser } from '@app/hooks/useUser';
import globalMessages from '@app/i18n/globalMessages';
import defineMessages from '@app/utils/defineMessages';
import {
  ArrowDownTrayIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline';
import {
  CheckIcon,
  InformationCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/solid';
import { MediaRequestStatus, MediaStatus } from '@server/constants/media';
import type Media from '@server/entity/Media';
import type { MediaRequest } from '@server/entity/MediaRequest';
import axios from 'axios';
import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import useSWR, { mutate } from 'swr';

const messages = defineMessages('components.RequestButton', {
  viewrequest: 'View Request',
  viewrequest4k: 'View 4K Request',
  requestmore: 'Request More',
  requestmore4k: 'Request More in 4K',
  approverequest: 'Approve Request',
  approverequest4k: 'Approve 4K Request',
  declinerequest: 'Decline Request',
  declinerequest4k: 'Decline 4K Request',
  approverequests:
    'Approve {requestCount, plural, one {Request} other {{requestCount} Requests}}',
  declinerequests:
    'Decline {requestCount, plural, one {Request} other {{requestCount} Requests}}',
  approve4krequests:
    'Approve {requestCount, plural, one {4K Request} other {{requestCount} 4K Requests}}',
  decline4krequests:
    'Decline {requestCount, plural, one {4K Request} other {{requestCount} 4K Requests}}',
  joinrequest: "I'm Interested",
  withdrawinterest: 'Withdraw Interest',
  interestadded: 'Your interest was added to the existing request.',
  interestremoved: 'Your interest was removed from the request.',
  requestempty:
    'No interested users remain. An administrator can now delete the request.',
  interesterror: 'Something went wrong while adding your interest.',
  withdrawerror: 'Something went wrong while removing your interest.',
});

type RequestParticipantsResponse = {
  users: { id: number }[];
};

type RemoveInterestResponse = {
  canDeleteRequest: boolean;
};

interface ButtonOption {
  id: string;
  text: string;
  action: () => void;
  svg?: React.ReactNode;
}

interface RequestButtonProps {
  mediaType: 'movie' | 'tv';
  onUpdate: () => void;
  tmdbId: number;
  media?: Media;
  isShowComplete?: boolean;
  is4kShowComplete?: boolean;
}

const RequestButton = ({
  tmdbId,
  onUpdate,
  media,
  mediaType,
  isShowComplete = false,
  is4kShowComplete = false,
}: RequestButtonProps) => {
  const intl = useIntl();
  const settings = useSettings();
  const { user, hasPermission } = useUser();
  const { addToast } = useToasts();
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showRequest4kModal, setShowRequest4kModal] = useState(false);
  const [editRequest, setEditRequest] = useState(false);
  const [isJoiningRequest, setIsJoiningRequest] = useState(false);

  // All pending requests
  const activeRequests = media?.requests.filter(
    (request) => request.status === MediaRequestStatus.PENDING && !request.is4k
  );
  const active4kRequests = media?.requests.filter(
    (request) => request.status === MediaRequestStatus.PENDING && request.is4k
  );

  // Current user's pending request, or the first pending request
  const activeRequest = useMemo(() => {
    return activeRequests && activeRequests.length > 0
      ? (activeRequests.find(
          (request) => request.requestedBy.id === user?.id
        ) ?? activeRequests[0])
      : undefined;
  }, [activeRequests, user]);
  const active4kRequest = useMemo(() => {
    return active4kRequests && active4kRequests.length > 0
      ? (active4kRequests.find(
          (request) => request.requestedBy.id === user?.id
        ) ?? active4kRequests[0])
      : undefined;
  }, [active4kRequests, user]);

  // An acquisition can be approved but not yet available. Seerr+ exposes an
  // interest action against it without creating another Radarr/Sonarr request.
  // Series interests are media-wide because one series can have several
  // active requests covering different groups of seasons.
  const joinableRequest = useMemo(
    () =>
      media?.requests.find(
        (request) =>
          !request.is4k &&
          (request.status === MediaRequestStatus.PENDING ||
            request.status === MediaRequestStatus.APPROVED)
      ),
    [media?.requests]
  );
  const interestEndpoint =
    mediaType === 'tv' && media?.id
      ? `/api/v1/seerrplus/media/${media.id}/interests`
      : joinableRequest
        ? `/api/v1/seerrplus/requests/${joinableRequest.id}/users`
        : null;
  const { data: interestUsers, mutate: mutateInterestUsers } =
    useSWR<RequestParticipantsResponse>(interestEndpoint);
  const interestedUsers = interestUsers?.users;
  const hasJoinedRequest = interestedUsers?.some(
    (participant) => participant.id === user?.id
  );

  const joinExistingRequest = async (): Promise<void> => {
    if (!joinableRequest || !media || isJoiningRequest) {
      return;
    }

    setIsJoiningRequest(true);
    try {
      await axios.post(
        mediaType === 'tv'
          ? `/api/v1/seerrplus/media/${media.id}/interests`
          : `/api/v1/seerrplus/requests/${joinableRequest.id}/users`,
        {}
      );
      await mutateInterestUsers();
      onUpdate();
      addToast(intl.formatMessage(messages.interestadded), {
        appearance: 'success',
        autoDismiss: true,
      });
    } catch {
      addToast(intl.formatMessage(messages.interesterror), {
        appearance: 'error',
        autoDismiss: true,
      });
    } finally {
      setIsJoiningRequest(false);
    }
  };

  const withdrawExistingInterest = async (): Promise<void> => {
    if (!joinableRequest || !media || !user || isJoiningRequest) {
      return;
    }

    setIsJoiningRequest(true);
    try {
      const response = await axios.delete<RemoveInterestResponse>(
        mediaType === 'tv'
          ? `/api/v1/seerrplus/media/${media.id}/interests/${user.id}`
          : `/api/v1/seerrplus/requests/${joinableRequest.id}/users/${user.id}`
      );
      await mutateInterestUsers();
      onUpdate();
      addToast(
        intl.formatMessage(
          response.data.canDeleteRequest
            ? messages.requestempty
            : messages.interestremoved
        ),
        {
          appearance: response.data.canDeleteRequest ? 'warning' : 'success',
          autoDismiss: true,
        }
      );
    } catch {
      addToast(intl.formatMessage(messages.withdrawerror), {
        appearance: 'error',
        autoDismiss: true,
      });
    } finally {
      setIsJoiningRequest(false);
    }
  };

  const modifyRequest = async (
    request: MediaRequest,
    type: 'approve' | 'decline'
  ) => {
    const response = await axios.post(`/api/v1/request/${request.id}/${type}`);

    if (response) {
      onUpdate();
      mutate('/api/v1/request/count');
    }
  };

  const modifyRequests = async (
    requests: MediaRequest[],
    type: 'approve' | 'decline'
  ): Promise<void> => {
    if (!requests) {
      return;
    }

    await Promise.all(
      requests.map(async (request) => {
        return axios.post(`/api/v1/request/${request.id}/${type}`);
      })
    );

    onUpdate();
    mutate('/api/v1/request/count');
  };

  const buttons: ButtonOption[] = [];

  // If there are pending requests, show request management options first
  if (activeRequest || active4kRequest) {
    if (
      activeRequest &&
      (activeRequest.requestedBy.id === user?.id ||
        (activeRequests?.length === 1 &&
          hasPermission(Permission.MANAGE_REQUESTS)))
    ) {
      buttons.push({
        id: 'active-request',
        text: intl.formatMessage(messages.viewrequest),
        action: () => {
          setEditRequest(true);
          setShowRequestModal(true);
        },
        svg: <InformationCircleIcon />,
      });
    }

    if (
      activeRequest &&
      hasPermission(Permission.MANAGE_REQUESTS) &&
      mediaType === 'movie'
    ) {
      buttons.push(
        {
          id: 'approve-request',
          text: intl.formatMessage(messages.approverequest),
          action: () => {
            modifyRequest(activeRequest, 'approve');
          },
          svg: <CheckIcon />,
        },
        {
          id: 'decline-request',
          text: intl.formatMessage(messages.declinerequest),
          action: () => {
            modifyRequest(activeRequest, 'decline');
          },
          svg: <XMarkIcon />,
        }
      );
    } else if (
      activeRequests &&
      activeRequests.length > 0 &&
      hasPermission(Permission.MANAGE_REQUESTS) &&
      mediaType === 'tv'
    ) {
      buttons.push(
        {
          id: 'approve-request-batch',
          text: intl.formatMessage(messages.approverequests, {
            requestCount: activeRequests.length,
          }),
          action: () => {
            modifyRequests(activeRequests, 'approve');
          },
          svg: <CheckIcon />,
        },
        {
          id: 'decline-request-batch',
          text: intl.formatMessage(messages.declinerequests, {
            requestCount: activeRequests.length,
          }),
          action: () => {
            modifyRequests(activeRequests, 'decline');
          },
          svg: <XMarkIcon />,
        }
      );
    }

    if (
      active4kRequest &&
      (active4kRequest.requestedBy.id === user?.id ||
        (active4kRequests?.length === 1 &&
          hasPermission(Permission.MANAGE_REQUESTS)))
    ) {
      buttons.push({
        id: 'active-4k-request',
        text: intl.formatMessage(messages.viewrequest4k),
        action: () => {
          setEditRequest(true);
          setShowRequest4kModal(true);
        },
        svg: <InformationCircleIcon />,
      });
    }

    if (
      active4kRequest &&
      hasPermission(Permission.MANAGE_REQUESTS) &&
      mediaType === 'movie'
    ) {
      buttons.push(
        {
          id: 'approve-4k-request',
          text: intl.formatMessage(messages.approverequest4k),
          action: () => {
            modifyRequest(active4kRequest, 'approve');
          },
          svg: <CheckIcon />,
        },
        {
          id: 'decline-4k-request',
          text: intl.formatMessage(messages.declinerequest4k),
          action: () => {
            modifyRequest(active4kRequest, 'decline');
          },
          svg: <XMarkIcon />,
        }
      );
    } else if (
      active4kRequests &&
      active4kRequests.length > 0 &&
      hasPermission(Permission.MANAGE_REQUESTS) &&
      mediaType === 'tv'
    ) {
      buttons.push(
        {
          id: 'approve-4k-request-batch',
          text: intl.formatMessage(messages.approve4krequests, {
            requestCount: active4kRequests.length,
          }),
          action: () => {
            modifyRequests(active4kRequests, 'approve');
          },
          svg: <CheckIcon />,
        },
        {
          id: 'decline-4k-request-batch',
          text: intl.formatMessage(messages.decline4krequests, {
            requestCount: active4kRequests.length,
          }),
          action: () => {
            modifyRequests(active4kRequests, 'decline');
          },
          svg: <XMarkIcon />,
        }
      );
    }
  }

  if (
    joinableRequest &&
    interestedUsers &&
    !hasJoinedRequest &&
    hasPermission(
      [
        Permission.REQUEST,
        mediaType === 'movie'
          ? Permission.REQUEST_MOVIE
          : Permission.REQUEST_TV,
      ],
      {
        type: 'or',
      }
    )
  ) {
    buttons.push({
      id: 'join-request',
      text: intl.formatMessage(messages.joinrequest),
      action: joinExistingRequest,
      svg: <UserPlusIcon />,
    });
  }

  if (joinableRequest && interestedUsers && hasJoinedRequest) {
    buttons.push({
      id: 'withdraw-interest',
      text: intl.formatMessage(messages.withdrawinterest),
      action: withdrawExistingInterest,
      svg: <XMarkIcon />,
    });
  }

  // Standard request button
  if (
    (!media ||
      media.status === MediaStatus.UNKNOWN ||
      (media.status === MediaStatus.DELETED && !activeRequest)) &&
    hasPermission(
      [
        Permission.REQUEST,
        mediaType === 'movie'
          ? Permission.REQUEST_MOVIE
          : Permission.REQUEST_TV,
      ],
      { type: 'or' }
    )
  ) {
    buttons.push({
      id: 'request',
      text: intl.formatMessage(globalMessages.request),
      action: () => {
        setEditRequest(false);
        setShowRequestModal(true);
      },
      svg: <ArrowDownTrayIcon />,
    });
  } else if (
    mediaType === 'tv' &&
    (!activeRequest || activeRequest.requestedBy.id !== user?.id) &&
    hasPermission([Permission.REQUEST, Permission.REQUEST_TV], {
      type: 'or',
    }) &&
    media &&
    media.status !== MediaStatus.BLOCKLISTED &&
    !isShowComplete
  ) {
    buttons.push({
      id: 'request-more',
      text: intl.formatMessage(messages.requestmore),
      action: () => {
        setEditRequest(false);
        setShowRequestModal(true);
      },
      svg: <ArrowDownTrayIcon />,
    });
  }

  // 4K request button
  if (
    (!media ||
      media.status4k === MediaStatus.UNKNOWN ||
      (media.status4k === MediaStatus.DELETED && !active4kRequest)) &&
    hasPermission(
      [
        Permission.REQUEST_4K,
        mediaType === 'movie'
          ? Permission.REQUEST_4K_MOVIE
          : Permission.REQUEST_4K_TV,
      ],
      { type: 'or' }
    ) &&
    ((settings.currentSettings.movie4kEnabled && mediaType === 'movie') ||
      (settings.currentSettings.series4kEnabled && mediaType === 'tv'))
  ) {
    buttons.push({
      id: 'request4k',
      text: intl.formatMessage(globalMessages.request4k),
      action: () => {
        setEditRequest(false);
        setShowRequest4kModal(true);
      },
      svg: <ArrowDownTrayIcon />,
    });
  } else if (
    mediaType === 'tv' &&
    (!active4kRequest || active4kRequest.requestedBy.id !== user?.id) &&
    hasPermission([Permission.REQUEST_4K, Permission.REQUEST_4K_TV], {
      type: 'or',
    }) &&
    media &&
    media.status4k !== MediaStatus.BLOCKLISTED &&
    !is4kShowComplete &&
    settings.currentSettings.series4kEnabled
  ) {
    buttons.push({
      id: 'request-more-4k',
      text: intl.formatMessage(messages.requestmore4k),
      action: () => {
        setEditRequest(false);
        setShowRequest4kModal(true);
      },
      svg: <ArrowDownTrayIcon />,
    });
  }

  const [buttonOne, ...others] = buttons;

  if (!buttonOne) {
    return null;
  }

  const isJoinRequestIconOnly = buttonOne.id === 'join-request';

  return (
    <>
      <RequestModal
        tmdbId={tmdbId}
        show={showRequestModal}
        type={mediaType}
        editRequest={editRequest ? activeRequest : undefined}
        onComplete={() => {
          onUpdate();
          setShowRequestModal(false);
        }}
        onCancel={() => setShowRequestModal(false)}
      />
      <RequestModal
        tmdbId={tmdbId}
        show={showRequest4kModal}
        type={mediaType}
        editRequest={editRequest ? active4kRequest : undefined}
        is4k
        onComplete={() => {
          onUpdate();
          setShowRequest4kModal(false);
        }}
        onCancel={() => setShowRequest4kModal(false)}
      />
      <ButtonWithDropdown
        text={
          <>
            {buttonOne.svg}
            {!isJoinRequestIconOnly && <span>{buttonOne.text}</span>}
          </>
        }
        onClick={buttonOne.action}
        className={`ml-2 ${
          isJoinRequestIconOnly
            ? '!mr-2 !h-[38px] !w-[54px] justify-center !px-0'
            : ''
        }`}
        aria-label={isJoinRequestIconOnly ? buttonOne.text : undefined}
        title={isJoinRequestIconOnly ? buttonOne.text : undefined}
      >
        {others && others.length > 0
          ? others.map((button) => (
              <ButtonWithDropdown.Item
                onClick={button.action}
                key={`request-option-${button.id}`}
              >
                {button.svg}
                <span>{button.text}</span>
              </ButtonWithDropdown.Item>
            ))
          : null}
      </ButtonWithDropdown>
    </>
  );
};

export default RequestButton;
