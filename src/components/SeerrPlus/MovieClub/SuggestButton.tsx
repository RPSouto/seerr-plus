import Button from '@app/components/Common/Button';
import defineMessages from '@app/utils/defineMessages';
import { LightBulbIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import useSWR from 'swr';

const messages = defineMessages('components.SeerrPlus.MovieClubSuggestButton', {
  suggest: 'Suggest for Movie Club',
  suggested: 'Suggested for Movie Club',
  count: '{count} suggestions this week',
});

type SuggestionData = {
  suggested: boolean;
  count: number;
  weekKey: string;
};

const MovieClubSuggestButton = ({
  mediaId,
  available,
}: {
  mediaId?: number;
  available: boolean;
}) => {
  const intl = useIntl();
  const [updating, setUpdating] = useState(false);
  const { data, mutate } = useSWR<SuggestionData>(
    mediaId && available
      ? `/api/v1/seerrplus/movie-club/suggestions/${mediaId}`
      : null
  );

  if (!mediaId || !available) return null;

  const toggleSuggestion = async () => {
    if (updating) return;
    setUpdating(true);
    try {
      const response = data?.suggested
        ? await axios.delete<SuggestionData>(
            `/api/v1/seerrplus/movie-club/suggestions/${mediaId}`
          )
        : await axios.post<SuggestionData>(
            `/api/v1/seerrplus/movie-club/suggestions/${mediaId}`
          );
      await mutate(response.data, false);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Button
      buttonType={data?.suggested ? 'success' : 'ghost'}
      className="ml-2 first:ml-0"
      disabled={updating || !data}
      onClick={toggleSuggestion}
      title={intl.formatMessage(messages.count, { count: data?.count ?? 0 })}
    >
      <LightBulbIcon />
    </Button>
  );
};

export default MovieClubSuggestButton;
