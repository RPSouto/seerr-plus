import defineMessages from '@app/utils/defineMessages';
import {
  ArrowPathIcon,
  FilmIcon,
  PlayCircleIcon,
  TvIcon,
} from '@heroicons/react/24/outline';
import axios from 'axios';
import Link from 'next/link';
import { useState } from 'react';
import { FormattedRelativeTime, useIntl } from 'react-intl';
import useSWR from 'swr';

const messages = defineMessages('components.SeerrPlus.LibraryStats', {
  title: 'Plex Library',
  streams: 'Streams',
  movies: 'Movies',
  series: 'Series',
  refresh: 'Refresh statistics',
  updated: 'Updated {relativeTime}',
  unavailable: 'Statistics unavailable',
  stale: 'Showing the last successful update',
  nowStreaming: 'Now streaming',
  noStreams: 'No active streams',
});

type LibraryStatsResponse = {
  configured: boolean;
  streams?: number;
  movies?: number;
  series?: number;
  currentStreams?: {
    title: string;
    mediaType?: string;
    pageUrl?: string;
    imageUrl?: string;
  }[];
  updatedAt?: string;
  stale?: boolean;
};

const LibraryStats = ({
  modal = false,
  onStreamOpen,
}: {
  modal?: boolean;
  onStreamOpen?: () => void;
}) => {
  const intl = useIntl();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { data, error, isValidating, mutate } =
    useSWR<LibraryStatsResponse>('/api/v1/tautulli-stats', {
      refreshInterval: 60 * 1000,
      revalidateOnFocus: true,
      refreshWhenHidden: false,
    });

  if (data && !data.configured) {
    return null;
  }

  if (!data && !error) {
    return null;
  }

  const refresh = async () => {
    setIsRefreshing(true);
    try {
      const response = await axios.get<LibraryStatsResponse>(
        '/api/v1/tautulli-stats',
        { params: { refresh: true } }
      );
      await mutate(response.data, false);
    } catch {
      await mutate().catch(() => undefined);
    } finally {
      setIsRefreshing(false);
    }
  };

  const relativeSeconds = data?.updatedAt
    ? Math.round((Date.parse(data.updatedAt) - Date.now()) / 1000)
    : undefined;
  const refreshing = isRefreshing || isValidating;

  return (
    <div
      className={`rounded-lg border border-gray-700 bg-gray-900 p-3 text-xs text-gray-300 ${
        modal ? '' : 'mx-2 mb-3'
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="font-bold text-gray-100">
          {intl.formatMessage(messages.title)}
        </span>
        <button
          type="button"
          className="rounded p-1 text-gray-400 transition hover:bg-gray-800 hover:text-white disabled:cursor-wait disabled:opacity-60"
          onClick={refresh}
          disabled={refreshing}
          title={intl.formatMessage(messages.refresh)}
          aria-label={intl.formatMessage(messages.refresh)}
        >
          <ArrowPathIcon
            className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
          />
        </button>
      </div>
      {data ? (
        <>
          <div className="mb-3 border-b border-gray-700 pb-3">
            <div className="mb-2 font-semibold text-gray-100">
              {intl.formatMessage(messages.nowStreaming)}
            </div>
            {data.currentStreams?.length ? (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {data.currentStreams.map((stream, index) => {
                  const poster = (
                    <div className="aspect-[2/3] overflow-hidden rounded border border-gray-700 bg-gray-800 transition group-hover:border-amber-400 group-focus:border-amber-400">
                      {stream.imageUrl ? (
                        <img
                          src={stream.imageUrl}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <PlayCircleIcon className="h-5 w-5 text-gray-500" />
                        </div>
                      )}
                    </div>
                  );

                  return stream.pageUrl ? (
                    <Link
                      key={`${stream.title}-${index}`}
                      href={stream.pageUrl}
                      className="group w-14 shrink-0 focus:outline-none"
                      title={stream.title}
                      onClick={onStreamOpen}
                    >
                      {poster}
                    </Link>
                  ) : (
                    <div
                      key={`${stream.title}-${index}`}
                      className="w-14 shrink-0"
                      title={stream.title}
                    >
                      {poster}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-gray-500">
                {intl.formatMessage(messages.noStreams)}
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center">
                <PlayCircleIcon className="mr-2 h-4 w-4" />
                {intl.formatMessage(messages.streams)}
              </span>
              <strong className="text-gray-100">{data.streams ?? 0}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center">
                <FilmIcon className="mr-2 h-4 w-4" />
                {intl.formatMessage(messages.movies)}
              </span>
              <strong className="text-gray-100">{data.movies ?? 0}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center">
                <TvIcon className="mr-2 h-4 w-4" />
                {intl.formatMessage(messages.series)}
              </span>
              <strong className="text-gray-100">{data.series ?? 0}</strong>
            </div>
          </div>
          {relativeSeconds !== undefined && (
            <div className="mt-2 border-t border-gray-700 pt-2 text-[10px] text-gray-500">
              {intl.formatMessage(messages.updated, {
                relativeTime: (
                  <FormattedRelativeTime
                    value={relativeSeconds}
                    numeric="auto"
                    updateIntervalInSeconds={10}
                  />
                ),
              })}
              {data.stale && (
                <div className="mt-1 text-amber-400">
                  {intl.formatMessage(messages.stale)}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="text-gray-400">
          {intl.formatMessage(messages.unavailable)}
        </div>
      )}
    </div>
  );
};

export default LibraryStats;
