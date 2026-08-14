import { getRepository } from '@server/datasource';
import type { MediaRequest } from '@server/entity/MediaRequest';
import MediaRequestParticipant from '@server/entity/MediaRequestParticipant';
import type { User } from '@server/entity/User';
import { seerrPlusEvents } from './events';

export type SeerrPlusUser = Pick<User, 'id' | 'displayName' | 'avatar'>;

const getMediaParticipants = async (
  mediaId: number,
  is4k?: boolean
): Promise<MediaRequestParticipant[]> => {
  const query = getRepository(MediaRequestParticipant)
    .createQueryBuilder('participant')
    .innerJoinAndSelect('participant.user', 'user')
    .leftJoinAndSelect('user.settings', 'settings')
    .innerJoin('participant.request', 'request')
    .where('request.mediaId = :mediaId', { mediaId })
    .orderBy('participant.createdAt', 'ASC');

  if (is4k !== undefined) {
    query.andWhere('request.is4k = :is4k', { is4k });
  }

  return query.getMany();
};

export const addRequestParticipant = async (
  request: MediaRequest,
  user: User
): Promise<MediaRequestParticipant> => {
  const repository = getRepository(MediaRequestParticipant);
  const existing = await repository.findOne({
    where: { request: { id: request.id }, user: { id: user.id } },
  });

  if (existing) {
    return existing;
  }

  try {
    const participant = await repository.save(
      new MediaRequestParticipant({ request, user })
    );
    seerrPlusEvents.emitInterestAdded({ request, user });
    return participant;
  } catch (error) {
    // A simultaneous join can race the unique constraint. Return the row
    // created by the winning request instead of surfacing a false conflict.
    const participant = await repository.findOne({
      where: { request: { id: request.id }, user: { id: user.id } },
    });
    if (participant) {
      return participant;
    }
    throw error;
  }
};

export const removeRequestParticipant = async (
  requestId: number,
  userId: number
): Promise<boolean> => {
  const result = await getRepository(MediaRequestParticipant).delete({
    request: { id: requestId },
    user: { id: userId },
  });
  return (result.affected ?? 0) > 0;
};

export const getRequestParticipants = async (
  requestId: number
): Promise<MediaRequestParticipant[]> =>
  getRepository(MediaRequestParticipant).find({
    where: { request: { id: requestId } },
    relations: { user: true },
    order: { createdAt: 'ASC' },
  });

export const getMediaRequesters = async (
  mediaId: number,
  is4k?: boolean
): Promise<SeerrPlusUser[]> => {
  const participants = await getMediaParticipants(mediaId, is4k);

  return [
    ...new Map(
      participants.map(({ user }) => [
        user.id,
        { id: user.id, displayName: user.displayName, avatar: user.avatar },
      ])
    ).values(),
  ];
};

export const getMediaInterestedUsers = async (
  mediaId: number,
  is4k: boolean
): Promise<User[]> => {
  const participants = await getMediaParticipants(mediaId, is4k);

  return [
    ...new Map(
      participants.map(({ user }) => [user.id, user] as const)
    ).values(),
  ];
};
