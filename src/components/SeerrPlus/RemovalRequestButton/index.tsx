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

const RemovalRequestButton = ({
  mediaId,
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
  const [loading, setLoading] = useState(false);
  const { data } = useSWR<RequestersResponse>(
    mediaId ? `/api/v1/seerrplus/media/${mediaId}/requesters` : null
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

  useEffect(() => {
    if (!canRemoveStandard && canRemove4k) {
      setIs4k(true);
    } else if (canRemoveStandard && !canRemove4k) {
      setIs4k(false);
    }
  }, [canRemove4k, canRemoveStandard]);

  if (!mediaId || !data || (!canRemoveStandard && !canRemove4k)) {
    return null;
  }

  const submit = async () => {
    setLoading(true);
    try {
      await axios.post(`/api/v1/seerrplus/media/${mediaId}/removal-requests`, {
        reason,
        message,
        is4k,
      });
      addToast(intl.formatMessage(messages.requestSent), {
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

  return (
    <>
      <Tooltip content={intl.formatMessage(messages.requestRemoval)}>
        <Button
          buttonType="danger"
          className="ml-2 first:ml-0"
          onClick={() => setShow(true)}
        >
          <TrashIcon />
        </Button>
      </Tooltip>
      <Transition show={show}>
        <Modal
          title={intl.formatMessage(messages.requestRemoval)}
          subTitle={intl.formatMessage(messages.adminApproval)}
          onCancel={() => setShow(false)}
          onOk={submit}
          okText={intl.formatMessage(messages.sendRequest)}
          okButtonType="danger"
          loading={loading}
        >
          <div className="space-y-4">
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
          </div>
        </Modal>
      </Transition>
    </>
  );
};

export default RemovalRequestButton;

