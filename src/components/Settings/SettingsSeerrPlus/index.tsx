import Button from '@app/components/Common/Button';
import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import PageTitle from '@app/components/Common/PageTitle';
import useToasts from '@app/hooks/useToasts';
import globalMessages from '@app/i18n/globalMessages';
import defineMessages from '@app/utils/defineMessages';
import { ArrowDownOnSquareIcon } from '@heroicons/react/24/outline';
import type { SeerrPlusSettings } from '@server/lib/settings';
import axios from 'axios';
import { Field, Form, Formik } from 'formik';
import { useIntl } from 'react-intl';
import useSWR, { mutate } from 'swr';
import * as Yup from 'yup';

const messages = defineMessages('components.Settings.SettingsSeerrPlus', {
  seerrplus: 'Seerr+',
  seerrplusSettings: 'Seerr+ Settings',
  seerrplusSettingsDescription:
    'Configure collaborative features, automation, and appearance for Seerr Plus.',
  movieClubSection: 'Movie Club (Clube de Cinema)',
  movieClubSectionDescription:
    'Weekly community voting sessions to choose the Film of the Week.',
  movieClubEnabled: 'Enable Movie Club',
  movieClubEnabledTip: 'Allow users to participate in weekly Movie Club votes',
  movieClubAutoRequestWinner: 'Auto-Request Winner in Radarr',
  movieClubAutoRequestWinnerTip:
    'Automatically create a request for the winning movie if not already requested or available',
  movieClubRadarrTag: 'Radarr Tag for Winner',
  movieClubRadarrTagTip: 'Tag applied to auto-requested movies in Radarr',
  movieClubNotifyMembers: 'Send Notifications',
  movieClubNotifyMembersTip:
    'Dispatch notifications when a voting session opens and when the winner is chosen',
  removalVotesSection: 'Removal Votes (Votações de Remoção)',
  removalVotesSectionDescription:
    'Collaborative voting system to manage disk space and retire unwatched media.',
  removalVotesEnabled: 'Enable Removal Votes',
  removalVotesEnabledTip:
    'Allow users to initiate and vote on media removal sessions',
  removalVoteQuorum: 'Minimum Quorum (Votes)',
  removalVoteQuorumTip:
    'Minimum number of total votes required for a removal session to be decisive',
  removalVoteGracePeriodDays: 'Grace Period (Days)',
  removalVoteGracePeriodDaysTip:
    'Number of days before an approved removal is actioned',
  removalAutoUnmonitorRadarr: 'Auto-Unmonitor in Radarr/Sonarr',
  removalAutoUnmonitorRadarrTip:
    'Automatically set monitored to false in Radarr/Sonarr when removal is finalized',
  appearanceSection: 'Appearance & Themes',
  appearanceSectionDescription: 'Visual customization for Seerr Plus.',
  pureBlackTheme: 'Pure Black (OLED) Theme',
  pureBlackThemeTip:
    'Render absolute black (#000000) backgrounds for true OLED displays',
  toastSettingsSuccess: 'Seerr+ settings saved successfully!',
  toastSettingsFailure: 'Something went wrong while saving Seerr+ settings.',
  validationQuorum: 'Quorum must be at least 1',
  validationGracePeriod: 'Grace period must be 0 or more days',
});

const SettingsSeerrPlus = () => {
  const intl = useIntl();
  const { addToast } = useToasts();
  const {
    data,
    error,
    mutate: revalidate,
  } = useSWR<SeerrPlusSettings>('/api/v1/settings/seerrplus');

  const SeerrPlusSchema = Yup.object().shape({
    removalVoteQuorum: Yup.number()
      .min(1, intl.formatMessage(messages.validationQuorum))
      .required(),
    removalVoteGracePeriodDays: Yup.number()
      .min(0, intl.formatMessage(messages.validationGracePeriod))
      .required(),
  });

  if (!data && !error) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <PageTitle
        title={[
          intl.formatMessage(messages.seerrplus),
          intl.formatMessage(globalMessages.settings),
        ]}
      />
      <div className="mb-6">
        <h3 className="heading">
          {intl.formatMessage(messages.seerrplusSettings)}
        </h3>
        <p className="description">
          {intl.formatMessage(messages.seerrplusSettingsDescription)}
        </p>
      </div>

      <div className="section">
        <Formik
          initialValues={{
            movieClubEnabled: data?.movieClubEnabled ?? true,
            movieClubAutoRequestWinner:
              data?.movieClubAutoRequestWinner ?? true,
            movieClubRadarrTag: data?.movieClubRadarrTag ?? 'movie-club',
            movieClubNotifyMembers: data?.movieClubNotifyMembers ?? true,
            removalVotesEnabled: data?.removalVotesEnabled ?? true,
            removalVoteQuorum: data?.removalVoteQuorum ?? 3,
            removalVoteGracePeriodDays: data?.removalVoteGracePeriodDays ?? 7,
            removalAutoUnmonitorRadarr:
              data?.removalAutoUnmonitorRadarr ?? false,
            pureBlackTheme: data?.pureBlackTheme ?? false,
          }}
          enableReinitialize
          validationSchema={SeerrPlusSchema}
          onSubmit={async (values) => {
            try {
              await axios.post('/api/v1/settings/seerrplus', values);
              mutate('/api/v1/settings/public');
              revalidate();
              addToast(intl.formatMessage(messages.toastSettingsSuccess), {
                autoDismiss: true,
                appearance: 'success',
              });
            } catch {
              addToast(intl.formatMessage(messages.toastSettingsFailure), {
                autoDismiss: true,
                appearance: 'error',
              });
            }
          }}
        >
          {({ isSubmitting, values, setFieldValue, errors, touched }) => (
            <Form className="section">
              {/* Movie Club Section */}
              <div className="form-row border-b border-gray-800 pb-4">
                <h4 className="text-lg font-medium text-white">
                  {intl.formatMessage(messages.movieClubSection)}
                </h4>
                <p className="text-sm text-gray-400">
                  {intl.formatMessage(messages.movieClubSectionDescription)}
                </p>
              </div>

              <div className="form-row">
                <label htmlFor="movieClubEnabled" className="checkbox-label">
                  <span className="mr-2">
                    {intl.formatMessage(messages.movieClubEnabled)}
                  </span>
                  <span className="label-tip">
                    {intl.formatMessage(messages.movieClubEnabledTip)}
                  </span>
                </label>
                <div className="form-input-area">
                  <Field
                    type="checkbox"
                    id="movieClubEnabled"
                    name="movieClubEnabled"
                    onChange={() => {
                      setFieldValue(
                        'movieClubEnabled',
                        !values.movieClubEnabled
                      );
                    }}
                  />
                </div>
              </div>

              {values.movieClubEnabled && (
                <>
                  <div className="form-row">
                    <label
                      htmlFor="movieClubAutoRequestWinner"
                      className="checkbox-label"
                    >
                      <span className="mr-2">
                        {intl.formatMessage(
                          messages.movieClubAutoRequestWinner
                        )}
                      </span>
                      <span className="label-tip">
                        {intl.formatMessage(
                          messages.movieClubAutoRequestWinnerTip
                        )}
                      </span>
                    </label>
                    <div className="form-input-area">
                      <Field
                        type="checkbox"
                        id="movieClubAutoRequestWinner"
                        name="movieClubAutoRequestWinner"
                        onChange={() => {
                          setFieldValue(
                            'movieClubAutoRequestWinner',
                            !values.movieClubAutoRequestWinner
                          );
                        }}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <label htmlFor="movieClubRadarrTag" className="text-label">
                      <span>
                        {intl.formatMessage(messages.movieClubRadarrTag)}
                      </span>
                      <span className="label-tip">
                        {intl.formatMessage(messages.movieClubRadarrTagTip)}
                      </span>
                    </label>
                    <div className="form-input-area">
                      <div className="form-input-field">
                        <Field
                          id="movieClubRadarrTag"
                          name="movieClubRadarrTag"
                          type="text"
                          placeholder="movie-club"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-row">
                    <label
                      htmlFor="movieClubNotifyMembers"
                      className="checkbox-label"
                    >
                      <span className="mr-2">
                        {intl.formatMessage(messages.movieClubNotifyMembers)}
                      </span>
                      <span className="label-tip">
                        {intl.formatMessage(messages.movieClubNotifyMembersTip)}
                      </span>
                    </label>
                    <div className="form-input-area">
                      <Field
                        type="checkbox"
                        id="movieClubNotifyMembers"
                        name="movieClubNotifyMembers"
                        onChange={() => {
                          setFieldValue(
                            'movieClubNotifyMembers',
                            !values.movieClubNotifyMembers
                          );
                        }}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Removal Votes Section */}
              <div className="form-row border-b border-gray-800 pb-4 pt-6">
                <h4 className="text-lg font-medium text-white">
                  {intl.formatMessage(messages.removalVotesSection)}
                </h4>
                <p className="text-sm text-gray-400">
                  {intl.formatMessage(messages.removalVotesSectionDescription)}
                </p>
              </div>

              <div className="form-row">
                <label htmlFor="removalVotesEnabled" className="checkbox-label">
                  <span className="mr-2">
                    {intl.formatMessage(messages.removalVotesEnabled)}
                  </span>
                  <span className="label-tip">
                    {intl.formatMessage(messages.removalVotesEnabledTip)}
                  </span>
                </label>
                <div className="form-input-area">
                  <Field
                    type="checkbox"
                    id="removalVotesEnabled"
                    name="removalVotesEnabled"
                    onChange={() => {
                      setFieldValue(
                        'removalVotesEnabled',
                        !values.removalVotesEnabled
                      );
                    }}
                  />
                </div>
              </div>

              {values.removalVotesEnabled && (
                <>
                  <div className="form-row">
                    <label htmlFor="removalVoteQuorum" className="text-label">
                      <span>
                        {intl.formatMessage(messages.removalVoteQuorum)}
                      </span>
                      <span className="label-tip">
                        {intl.formatMessage(messages.removalVoteQuorumTip)}
                      </span>
                    </label>
                    <div className="form-input-area">
                      <Field
                        id="removalVoteQuorum"
                        name="removalVoteQuorum"
                        type="number"
                        min="1"
                        className="short"
                      />
                      {errors.removalVoteQuorum &&
                        touched.removalVoteQuorum && (
                          <div className="error">
                            {errors.removalVoteQuorum}
                          </div>
                        )}
                    </div>
                  </div>

                  <div className="form-row">
                    <label
                      htmlFor="removalVoteGracePeriodDays"
                      className="text-label"
                    >
                      <span>
                        {intl.formatMessage(
                          messages.removalVoteGracePeriodDays
                        )}
                      </span>
                      <span className="label-tip">
                        {intl.formatMessage(
                          messages.removalVoteGracePeriodDaysTip
                        )}
                      </span>
                    </label>
                    <div className="form-input-area">
                      <Field
                        id="removalVoteGracePeriodDays"
                        name="removalVoteGracePeriodDays"
                        type="number"
                        min="0"
                        className="short"
                      />
                      {errors.removalVoteGracePeriodDays &&
                        touched.removalVoteGracePeriodDays && (
                          <div className="error">
                            {errors.removalVoteGracePeriodDays}
                          </div>
                        )}
                    </div>
                  </div>

                  <div className="form-row">
                    <label
                      htmlFor="removalAutoUnmonitorRadarr"
                      className="checkbox-label"
                    >
                      <span className="mr-2">
                        {intl.formatMessage(
                          messages.removalAutoUnmonitorRadarr
                        )}
                      </span>
                      <span className="label-tip">
                        {intl.formatMessage(
                          messages.removalAutoUnmonitorRadarrTip
                        )}
                      </span>
                    </label>
                    <div className="form-input-area">
                      <Field
                        type="checkbox"
                        id="removalAutoUnmonitorRadarr"
                        name="removalAutoUnmonitorRadarr"
                        onChange={() => {
                          setFieldValue(
                            'removalAutoUnmonitorRadarr',
                            !values.removalAutoUnmonitorRadarr
                          );
                        }}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Appearance / OLED Pure Black */}
              <div className="form-row border-b border-gray-800 pb-4 pt-6">
                <h4 className="text-lg font-medium text-white">
                  {intl.formatMessage(messages.appearanceSection)}
                </h4>
                <p className="text-sm text-gray-400">
                  {intl.formatMessage(messages.appearanceSectionDescription)}
                </p>
              </div>

              <div className="form-row">
                <label htmlFor="pureBlackTheme" className="checkbox-label">
                  <span className="mr-2">
                    {intl.formatMessage(messages.pureBlackTheme)}
                  </span>
                  <span className="label-tip">
                    {intl.formatMessage(messages.pureBlackThemeTip)}
                  </span>
                </label>
                <div className="form-input-area">
                  <Field
                    type="checkbox"
                    id="pureBlackTheme"
                    name="pureBlackTheme"
                    onChange={() => {
                      setFieldValue('pureBlackTheme', !values.pureBlackTheme);
                    }}
                  />
                </div>
              </div>

              <div className="actions">
                <div className="flex justify-end">
                  <span className="ml-3 inline-flex rounded-md shadow-sm">
                    <Button
                      buttonType="primary"
                      type="submit"
                      disabled={isSubmitting}
                    >
                      <ArrowDownOnSquareIcon />
                      <span>
                        {isSubmitting
                          ? intl.formatMessage(globalMessages.saving)
                          : intl.formatMessage(globalMessages.save)}
                      </span>
                    </Button>
                  </span>
                </div>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </>
  );
};

export default SettingsSeerrPlus;
