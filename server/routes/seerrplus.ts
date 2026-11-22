import {
  IssueStatus,
  IssueType,
  RemovalRequestDecision,
  RemovalRequestReason,
} from '@server/constants/issue';
import { MediaRequestStatus, MediaStatus } from '@server/constants/media';
import { getRepository } from '@server/datasource';
import Issue from '@server/entity/Issue';
import IssueComment from '@server/entity/IssueComment';
import Media from '@server/entity/Media';
import { MediaRequest } from '@server/entity/MediaRequest';
import MediaRequestParticipant from '@server/entity/MediaRequestParticipant';
import RemovalVote, { RemovalVoteValue } from '@server/entity/RemovalVote';
import RemovalVoteParticipant from '@server/entity/RemovalVoteParticipant';
import RemovalVoteSession, {
  RemovalVoteSessionStatus,
} from '@server/entity/RemovalVoteSession';
import { User } from '@server/entity/User';
import { Permission } from '@server/lib/permissions';
import { sendRemovalVoteNotification } from '@server/lib/seerrplus/removalVoteNotifications';
import { removeMediaFromService } from '@server/lib/seerrplus/removals';
import {
  addRequestParticipant,
  getMediaRequesters,
  getPublicMediaRequesters,
  getRequestParticipants,
  removeRequestParticipant,
} from '@server/lib/seerrplus/requests';
import { getSettings } from '@server/lib/settings';
import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import { merge } from 'lodash';
import movieClubRoutes from './movieclub';

const seerrPlusRoutes = Router();

seerrPlusRoutes.use('/movie-club', movieClubRoutes);

const mapUser = (user: User) => ({
  id: user.id,
  displayName: user.displayName,
  avatar: user.avatar,
});

const canManageParticipants = (user: User): boolean =>
  user.hasPermission([Permission.MANAGE_REQUESTS, Permission.MANAGE_USERS], {
    type: 'or',
  });

seerrPlusRoutes.get('/requests/:id', async (req, res, next) => {
  try {
    const request = await getRepository(MediaRequest).findOne({
      where: { id: Number(req.params.id) },
    });
    if (!request) {
      return next({ status: 404, message: 'Request not found.' });
    }

    const participants = await getRequestParticipants(request.id);
    return res.json({
      requestId: request.id,
      mediaId: request.media.id,
      requestedBy: mapUser(request.requestedBy),
      participants: participants.map(({ user, createdAt }) => ({
        ...mapUser(user),
        createdAt,
      })),
    });
  } catch (error) {
    return next({
      status: 500,
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

seerrPlusRoutes.get('/requests/:id/users', async (req, res, next) => {
  try {
    const requestId = Number(req.params.id);
    const request = await getRepository(MediaRequest).findOne({
      where: { id: requestId },
    });
    if (!request) {
      return next({ status: 404, message: 'Request not found.' });
    }

    const participants = await getRequestParticipants(requestId);
    return res.json({
      requestId,
      requestedBy: mapUser(request.requestedBy),
      users: participants.map(({ user, createdAt }) => ({
        ...mapUser(user),
        createdAt,
      })),
    });
  } catch (error) {
    return next({
      status: 500,
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

seerrPlusRoutes.post('/requests/:id/users', async (req, res, next) => {
  try {
    if (!req.user) {
      return next({ status: 401, message: 'Authentication required.' });
    }

    const targetUserId = Number(req.body?.userId ?? req.user.id);
    if (targetUserId !== req.user.id && !canManageParticipants(req.user)) {
      return next({
        status: 403,
        message: 'You cannot add an interest for another user.',
      });
    }

    const [request, targetUser] = await Promise.all([
      getRepository(MediaRequest).findOne({
        where: { id: Number(req.params.id) },
      }),
      getRepository(User).findOne({ where: { id: targetUserId } }),
    ]);
    if (!request || !targetUser) {
      return next({ status: 404, message: 'Request or user not found.' });
    }
    if (
      request.status !== MediaRequestStatus.PENDING &&
      request.status !== MediaRequestStatus.APPROVED
    ) {
      return next({
        status: 409,
        message: 'Interest can only be added to an active request.',
      });
    }

    const participant = await addRequestParticipant(request, targetUser);
    return res.status(201).json({
      requestId: request.id,
      user: mapUser(participant.user),
      createdAt: participant.createdAt,
    });
  } catch (error) {
    return next({
      status: 500,
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

seerrPlusRoutes.delete(
  '/requests/:id/users/:userId',
  async (req, res, next) => {
    try {
      if (!req.user) {
        return next({ status: 401, message: 'Authentication required.' });
      }

      const requestId = Number(req.params.id);
      const targetUserId = Number(req.params.userId);
      if (targetUserId !== req.user.id && !canManageParticipants(req.user)) {
        return next({
          status: 403,
          message: "You cannot remove another user's interest.",
        });
      }

      const request = await getRepository(MediaRequest).findOne({
        where: { id: requestId },
      });
      if (!request) {
        return next({ status: 404, message: 'Request not found.' });
      }
      if (!(await removeRequestParticipant(requestId, targetUserId))) {
        return next({ status: 404, message: 'Participant not found.' });
      }
      const remainingParticipants = (await getRequestParticipants(requestId))
        .length;
      return res.json({
        requestId,
        userId: targetUserId,
        remainingParticipants,
        canDeleteRequest: remainingParticipants === 0,
      });
    } catch (error) {
      return next({
        status: 500,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

seerrPlusRoutes.get('/media/:mediaId/requesters', async (req, res, next) => {
  try {
    const mediaId = Number(req.params.mediaId);
    const [requesters, requesters4k] = await Promise.all([
      getMediaRequesters(mediaId, false),
      getMediaRequesters(mediaId, true),
    ]);
    const isAdmin = req.user?.hasPermission(Permission.ADMIN) ?? false;

    return res.json({
      mediaId,
      requesters,
      requesters4k,
      isAdmin,
      canRequestRemoval:
        isAdmin || requesters.some(({ id }) => id === req.user?.id),
      canRequestRemoval4k:
        isAdmin || requesters4k.some(({ id }) => id === req.user?.id),
    });
  } catch (error) {
    return next({
      status: 500,
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

seerrPlusRoutes.get(
  '/media/:mediaId/public-requesters',
  async (req, res, next) => {
    try {
      const mediaId = Number(req.params.mediaId);
      const requesters = await getPublicMediaRequesters(mediaId);

      return res.json({
        mediaId,
        users: requesters,
      });
    } catch (error) {
      return next({
        status: 500,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

seerrPlusRoutes.get('/media/:mediaId/interests', async (req, res, next) => {
  try {
    const mediaId = Number(req.params.mediaId);
    const participations = await getRepository(MediaRequestParticipant)
      .createQueryBuilder('participant')
      .innerJoinAndSelect('participant.user', 'user')
      .innerJoin('participant.request', 'request')
      .where('request.mediaId = :mediaId', { mediaId })
      .andWhere('request.is4k = :is4k', { is4k: false })
      .andWhere('request.status IN (:...statuses)', {
        statuses: [MediaRequestStatus.PENDING, MediaRequestStatus.APPROVED],
      })
      .orderBy('participant.createdAt', 'ASC')
      .getMany();
    const users = [
      ...new Map(
        participations.map(({ user }) => [user.id, mapUser(user)] as const)
      ).values(),
    ];

    return res.json({ mediaId, users });
  } catch (error) {
    return next({
      status: 500,
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

seerrPlusRoutes.post('/media/:mediaId/interests', async (req, res, next) => {
  try {
    if (!req.user) {
      return next({ status: 401, message: 'Authentication required.' });
    }

    const mediaId = Number(req.params.mediaId);
    const targetUserId = Number(req.body?.userId ?? req.user.id);
    if (targetUserId !== req.user.id && !canManageParticipants(req.user)) {
      return next({
        status: 403,
        message: 'You cannot add an interest for another user.',
      });
    }

    const [media, targetUser, activeRequests] = await Promise.all([
      getRepository(Media).findOne({ where: { id: mediaId } }),
      getRepository(User).findOne({ where: { id: targetUserId } }),
      getRepository(MediaRequest)
        .createQueryBuilder('request')
        .where('request.mediaId = :mediaId', { mediaId })
        .andWhere('request.is4k = :is4k', { is4k: false })
        .andWhere('request.status IN (:...statuses)', {
          statuses: [MediaRequestStatus.PENDING, MediaRequestStatus.APPROVED],
        })
        .getMany(),
    ]);

    if (!media || !targetUser) {
      return next({ status: 404, message: 'Media or user not found.' });
    }
    if (activeRequests.length === 0) {
      return next({ status: 409, message: 'No active requests found.' });
    }

    await Promise.all(
      activeRequests.map((request) =>
        addRequestParticipant(request, targetUser)
      )
    );

    return res.status(201).json({
      mediaId,
      user: mapUser(targetUser),
      requestIds: activeRequests.map(({ id }) => id),
    });
  } catch (error) {
    return next({
      status: 500,
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

seerrPlusRoutes.delete(
  '/media/:mediaId/interests/:userId',
  async (req, res, next) => {
    try {
      if (!req.user) {
        return next({ status: 401, message: 'Authentication required.' });
      }

      const mediaId = Number(req.params.mediaId);
      const targetUserId = Number(req.params.userId);
      if (targetUserId !== req.user.id && !canManageParticipants(req.user)) {
        return next({
          status: 403,
          message: "You cannot remove another user's interest.",
        });
      }

      const participations = await getRepository(MediaRequestParticipant)
        .createQueryBuilder('participant')
        .innerJoinAndSelect('participant.request', 'request')
        .where('request.mediaId = :mediaId', { mediaId })
        .andWhere('request.is4k = :is4k', { is4k: false })
        .andWhere('request.status IN (:...statuses)', {
          statuses: [MediaRequestStatus.PENDING, MediaRequestStatus.APPROVED],
        })
        .andWhere('participant.userId = :targetUserId', { targetUserId })
        .getMany();

      if (participations.length === 0) {
        return next({ status: 404, message: 'Participant not found.' });
      }

      const requestIds = participations.map(({ request }) => request.id);
      await Promise.all(
        requestIds.map((requestId) =>
          removeRequestParticipant(requestId, targetUserId)
        )
      );
      const remainingParticipants = await Promise.all(
        requestIds.map((requestId) => getRequestParticipants(requestId))
      );

      return res.json({
        mediaId,
        userId: targetUserId,
        requestIds,
        canDeleteRequest: remainingParticipants.every(
          (participants) => participants.length === 0
        ),
      });
    } catch (error) {
      return next({
        status: 500,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

const removalReasonLabels: Record<RemovalRequestReason, string> = {
  [RemovalRequestReason.FREE_SPACE]: 'Free up storage space',
  [RemovalRequestReason.NO_INTEREST]: 'Content no longer has interest',
  [RemovalRequestReason.OTHER]: 'Other reason',
};

const normalizeDisplayTitle = (title?: unknown) => {
  const normalized = typeof title === 'string' ? title.trim() : '';

  return normalized.length > 0 ? normalized.slice(0, 255) : null;
};

const fallbackRemovalVoteTitle = (media: Media) =>
  `${media.mediaType === 'tv' ? 'Series' : 'Movie'} #${media.tmdbId}`;

const getRemovalVoteInterestedUsers = async (
  mediaId: number,
  is4k: boolean
) => {
  const participations = await getRepository(MediaRequestParticipant)
    .createQueryBuilder('participant')
    .innerJoinAndSelect('participant.user', 'user')
    .innerJoin('participant.request', 'request')
    .where('request.mediaId = :mediaId', { mediaId })
    .andWhere('request.is4k = :is4k', { is4k })
    .getMany();

  return [
    ...new Map(
      participations.map(({ user }) => [user.id, user] as const)
    ).values(),
  ];
};

const getOpenRemovalVoteSession = (mediaId: number, is4k: boolean) =>
  getRepository(RemovalVoteSession)
    .createQueryBuilder('session')
    .leftJoinAndSelect('session.media', 'media')
    .leftJoinAndSelect('session.issue', 'issue')
    .leftJoinAndSelect('session.participants', 'participant')
    .leftJoinAndSelect('participant.user', 'participantUser')
    .leftJoinAndSelect('session.votes', 'vote')
    .leftJoinAndSelect('session.createdBy', 'createdBy')
    .leftJoinAndSelect('vote.user', 'voteUser')
    .where('session.mediaId = :mediaId', { mediaId })
    .andWhere('session.is4k = :is4k', { is4k })
    .andWhere('session.status = :status', {
      status: RemovalVoteSessionStatus.OPEN,
    })
    .orderBy('session.createdAt', 'DESC')
    .getOne();

const mapRemovalVoteSession = async (
  session: RemovalVoteSession | null,
  currentUser?: User
) => {
  if (!session) {
    return null;
  }

  const interestedUsers =
    session.participants?.map(({ user }) => user) ??
    (await getRemovalVoteInterestedUsers(session.media.id, session.is4k));
  const agreeVotes = session.votes?.filter(
    ({ vote }) => vote === RemovalVoteValue.AGREE
  );
  const keepVotes = session.votes?.filter(
    ({ vote }) => vote === RemovalVoteValue.KEEP
  );
  const myVote = session.votes?.find(({ user }) => user.id === currentUser?.id);

  return {
    id: session.id,
    mediaId: session.media.id,
    media: {
      id: session.media.id,
      tmdbId: session.media.tmdbId,
      mediaType: session.media.mediaType,
      title: session.displayTitle || fallbackRemovalVoteTitle(session.media),
    },
    issueId: session.issue?.id,
    is4k: session.is4k,
    reason: session.reason,
    message: session.message,
    status: session.status,
    createdAt: session.createdAt,
    createdBy: mapUser(session.createdBy),
    interestedUsers: interestedUsers.map(mapUser),
    canVote:
      Boolean(currentUser?.hasPermission(Permission.ADMIN)) ||
      interestedUsers.some(({ id }) => id === currentUser?.id),
    myVote: myVote?.vote,
    totals: {
      agree: agreeVotes?.length ?? 0,
      keep: keepVotes?.length ?? 0,
      total: session.votes?.length ?? 0,
      interested: interestedUsers.length,
    },
    votes:
      currentUser?.hasPermission(Permission.ADMIN) || session.status !== 0
        ? (session.votes?.map(({ user, vote, createdAt }) => ({
            user: mapUser(user),
            vote,
            createdAt,
          })) ?? [])
        : [],
  };
};

seerrPlusRoutes.get('/votes', async (req, res, next) => {
  try {
    if (!req.user) {
      return next({ status: 401, message: 'Authentication required.' });
    }

    const isAdmin = req.user.hasPermission(Permission.ADMIN);
    const sessions = await getRepository(RemovalVoteSession)
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.media', 'media')
      .leftJoinAndSelect('session.issue', 'issue')
      .leftJoinAndSelect('session.participants', 'participant')
      .leftJoinAndSelect('participant.user', 'participantUser')
      .leftJoinAndSelect('session.votes', 'vote')
      .leftJoinAndSelect('session.createdBy', 'createdBy')
      .leftJoinAndSelect('vote.user', 'voteUser')
      .orderBy('session.createdAt', 'DESC')
      .take(50)
      .getMany();

    const mappedRemovalVotes = await Promise.all(
      sessions.map((session) => mapRemovalVoteSession(session, req.user))
    );
    const removalVotes: NonNullable<
      Awaited<ReturnType<typeof mapRemovalVoteSession>>
    >[] = [];
    for (const session of mappedRemovalVotes) {
      if (
        session &&
        (isAdmin || session.canVote || session.createdBy.id === req.user.id)
      ) {
        removalVotes.push(session);
      }
    }

    return res.json({ removalVotes });
  } catch (error) {
    return next({
      status: 500,
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

seerrPlusRoutes.get('/media/:mediaId/removal-vote', async (req, res, next) => {
  try {
    const mediaId = Number(req.params.mediaId);
    const is4k = req.query.is4k === 'true';
    const [media, session, interestedUsers] = await Promise.all([
      getRepository(Media).findOne({ where: { id: mediaId } }),
      getOpenRemovalVoteSession(mediaId, is4k),
      getRemovalVoteInterestedUsers(mediaId, is4k),
    ]);

    if (!media) {
      return next({ status: 404, message: 'Media not found.' });
    }

    const isAdmin = req.user?.hasPermission(Permission.ADMIN) ?? false;

    return res.json({
      mediaId,
      is4k,
      session: await mapRemovalVoteSession(session, req.user),
      canStart:
        isAdmin || interestedUsers.some(({ id }) => id === req.user?.id),
      canAdminRemove: isAdmin,
    });
  } catch (error) {
    return next({
      status: 500,
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

seerrPlusRoutes.post(
  '/media/:mediaId/removal-votes',
  async (req, res, next) => {
    try {
      if (!req.user) {
        return next({ status: 401, message: 'Authentication required.' });
      }

      const mediaId = Number(req.params.mediaId);
      const is4k = Boolean(req.body?.is4k);
      const reason = req.body?.reason as RemovalRequestReason;
      if (!Object.values(RemovalRequestReason).includes(reason)) {
        return next({ status: 400, message: 'Invalid removal reason.' });
      }

      const [media, existing, interestedUsers] = await Promise.all([
        getRepository(Media).findOne({ where: { id: mediaId } }),
        getOpenRemovalVoteSession(mediaId, is4k),
        getRemovalVoteInterestedUsers(mediaId, is4k),
      ]);

      if (!media) {
        return next({ status: 404, message: 'Media not found.' });
      }
      if (existing) {
        return next({ status: 409, message: 'Removal vote already open.' });
      }

      const isAdmin = req.user.hasPermission(Permission.ADMIN);
      if (!isAdmin && !interestedUsers.some(({ id }) => id === req.user?.id)) {
        return next({
          status: 403,
          message: 'Only interested users can start a removal vote.',
        });
      }

      const audience = String(req.body?.audience ?? 'interested');
      if (
        !['interested', 'selected', 'all'].includes(audience) ||
        (!isAdmin && audience !== 'interested')
      ) {
        return next({ status: 403, message: 'Invalid removal vote audience.' });
      }

      let votingUsers = interestedUsers;
      if (isAdmin && audience === 'all') {
        votingUsers = await getRepository(User).find();
      } else if (isAdmin && audience === 'selected') {
        const userIds = Array.isArray(req.body?.userIds)
          ? [...new Set<number>(req.body.userIds.map(Number))]
          : [];
        if (userIds.length === 0) {
          return next({
            status: 400,
            message: 'Select at least one user for this removal vote.',
          });
        }
        votingUsers = await getRepository(User)
          .createQueryBuilder('user')
          .where('user.id IN (:...userIds)', { userIds })
          .getMany();
      }
      votingUsers = [
        ...new Map(
          votingUsers.map((user) => [user.id, user] as const)
        ).values(),
      ];

      const details = String(req.body?.message ?? '').trim();
      const displayTitle = normalizeDisplayTitle(req.body?.mediaTitle);
      const issue = await getRepository(Issue).save(
        new Issue({
          createdBy: req.user,
          issueType: IssueType.REMOVAL,
          status: IssueStatus.OPEN,
          removalReason: reason,
          removalIs4k: is4k,
          media,
          comments: [
            new IssueComment({
              user: req.user,
              message: `Removal vote opened: ${removalReasonLabels[reason]}${
                details ? `\n\n${details}` : ''
              }`,
            }),
          ],
        })
      );

      const session = await getRepository(RemovalVoteSession).save(
        new RemovalVoteSession({
          media,
          issue,
          createdBy: req.user,
          is4k,
          reason,
          message: details,
          displayTitle,
          status: RemovalVoteSessionStatus.OPEN,
        })
      );
      await getRepository(RemovalVoteParticipant).save(
        votingUsers.map(
          (user) =>
            new RemovalVoteParticipant({
              session,
              user,
            })
        )
      );

      const recipients = votingUsers.filter(({ id }) => id !== req.user?.id);
      await sendRemovalVoteNotification({
        media,
        mediaTitle: displayTitle,
        requestedBy: req.user,
        recipients,
        reason: removalReasonLabels[reason],
      });

      return res
        .status(201)
        .json(
          await mapRemovalVoteSession(
            await getOpenRemovalVoteSession(mediaId, is4k),
            req.user
          )
        );
    } catch (error) {
      return next({
        status: 500,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

seerrPlusRoutes.post(
  '/removal-votes/:sessionId/vote',
  async (req, res, next) => {
    try {
      if (!req.user) {
        return next({ status: 401, message: 'Authentication required.' });
      }

      const voteValue =
        req.body?.vote === 'agree'
          ? RemovalVoteValue.AGREE
          : req.body?.vote === 'keep'
            ? RemovalVoteValue.KEEP
            : undefined;
      if (!voteValue) {
        return next({ status: 400, message: 'Invalid vote.' });
      }

      const session = await getRepository(RemovalVoteSession).findOne({
        where: { id: Number(req.params.sessionId) },
        relations: { votes: true },
      });
      if (!session) {
        return next({ status: 404, message: 'Removal vote not found.' });
      }
      if (session.status !== RemovalVoteSessionStatus.OPEN) {
        return next({ status: 409, message: 'Removal vote is closed.' });
      }

      const participants = await getRepository(RemovalVoteParticipant).find({
        where: { session: { id: session.id } },
      });
      const allowedUsers =
        participants.length > 0
          ? participants.map(({ user }) => user)
          : await getRemovalVoteInterestedUsers(session.media.id, session.is4k);
      if (
        !req.user.hasPermission(Permission.ADMIN) &&
        !allowedUsers.some(({ id }) => id === req.user?.id)
      ) {
        return next({
          status: 403,
          message: 'Only interested users can vote on this removal.',
        });
      }

      const voteRepository = getRepository(RemovalVote);
      const existing = await voteRepository.findOne({
        where: {
          session: { id: session.id },
          user: { id: req.user.id },
        },
      });

      if (existing) {
        existing.vote = voteValue;
        await voteRepository.save(existing);
      } else {
        await voteRepository.save(
          new RemovalVote({
            session,
            user: req.user,
            vote: voteValue,
          })
        );
      }

      return res.json(
        await mapRemovalVoteSession(
          await getOpenRemovalVoteSession(session.media.id, session.is4k),
          req.user
        )
      );
    } catch (error) {
      return next({
        status: 500,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

seerrPlusRoutes.post(
  '/removal-requests/:issueId/start-vote',
  async (req, res, next) => {
    try {
      if (!req.user?.hasPermission(Permission.ADMIN)) {
        return next({ status: 403, message: 'Administrator access required.' });
      }

      const issue = await getRepository(Issue).findOne({
        where: { id: Number(req.params.issueId) },
        relations: { comments: true, media: true, createdBy: true },
      });
      if (!issue || issue.issueType !== IssueType.REMOVAL) {
        return next({ status: 404, message: 'Removal request not found.' });
      }
      if (issue.status !== IssueStatus.OPEN) {
        return next({
          status: 409,
          message: 'Removal request already decided.',
        });
      }

      const existing = await getOpenRemovalVoteSession(
        issue.media.id,
        issue.removalIs4k
      );
      if (existing) {
        return next({ status: 409, message: 'Removal vote already open.' });
      }

      const displayTitle = normalizeDisplayTitle(req.body?.mediaTitle);
      const interestedUsers = await getRemovalVoteInterestedUsers(
        issue.media.id,
        issue.removalIs4k
      );
      const audience = String(req.body?.audience ?? 'interested');
      if (!['interested', 'selected', 'all'].includes(audience)) {
        return next({ status: 400, message: 'Invalid removal vote audience.' });
      }

      let votingUsers = interestedUsers;
      if (audience === 'all') {
        votingUsers = await getRepository(User).find();
      } else if (audience === 'selected') {
        const userIds = Array.isArray(req.body?.userIds)
          ? [...new Set<number>(req.body.userIds.map(Number))]
          : [];
        if (userIds.length === 0) {
          return next({
            status: 400,
            message: 'Select at least one user for this removal vote.',
          });
        }
        votingUsers = await getRepository(User)
          .createQueryBuilder('user')
          .where('user.id IN (:...userIds)', { userIds })
          .getMany();
      }
      votingUsers = [
        ...new Map(
          votingUsers.map((user) => [user.id, user] as const)
        ).values(),
      ];

      const session = await getRepository(RemovalVoteSession).save(
        new RemovalVoteSession({
          media: issue.media,
          issue,
          createdBy: req.user,
          is4k: issue.removalIs4k,
          reason: issue.removalReason,
          message: String(req.body?.message ?? '').trim() || null,
          displayTitle,
          status: RemovalVoteSessionStatus.OPEN,
        })
      );
      await getRepository(RemovalVoteParticipant).save(
        votingUsers.map(
          (user) =>
            new RemovalVoteParticipant({
              session,
              user,
            })
        )
      );

      issue.comments.push(
        new IssueComment({
          user: req.user,
          message: `Removal vote started for ${
            audience === 'all'
              ? 'all users'
              : audience === 'selected'
                ? 'selected users'
                : 'interested users'
          }.`,
        })
      );
      await getRepository(Issue).save(issue);

      const recipients = votingUsers.filter(({ id }) => id !== req.user?.id);
      await sendRemovalVoteNotification({
        media: issue.media,
        mediaTitle: displayTitle,
        requestedBy: issue.createdBy,
        recipients,
        reason: issue.removalReason
          ? removalReasonLabels[issue.removalReason as RemovalRequestReason]
          : undefined,
      });

      return res
        .status(201)
        .json(
          await mapRemovalVoteSession(
            await getOpenRemovalVoteSession(issue.media.id, issue.removalIs4k),
            req.user
          )
        );
    } catch (error) {
      return next({
        status: 500,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

seerrPlusRoutes.post(
  '/removal-votes/:sessionId/close',
  async (req, res, next) => {
    try {
      if (!req.user?.hasPermission(Permission.ADMIN)) {
        return next({ status: 403, message: 'Administrator access required.' });
      }

      const repository = getRepository(RemovalVoteSession);
      const session = await repository.findOne({
        where: { id: Number(req.params.sessionId) },
        relations: { issue: { comments: true }, media: true },
      });
      if (!session) {
        return next({ status: 404, message: 'Removal vote not found.' });
      }
      if (session.status !== RemovalVoteSessionStatus.OPEN) {
        return next({
          status: 409,
          message: 'Removal vote is already closed.',
        });
      }

      session.status = RemovalVoteSessionStatus.CLOSED;
      await repository.save(session);

      if (session.issue) {
        session.issue.comments.push(
          new IssueComment({
            user: req.user,
            message: 'Removal vote closed by administrator.',
          })
        );
        await getRepository(Issue).save(session.issue);
      }

      return res.json(await mapRemovalVoteSession(session, req.user));
    } catch (error) {
      return next({
        status: 500,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

seerrPlusRoutes.post(
  '/media/:mediaId/removal-requests',
  async (req, res, next) => {
    try {
      if (!req.user) {
        return next({ status: 401, message: 'Authentication required.' });
      }
      const mediaId = Number(req.params.mediaId);
      const is4k = Boolean(req.body?.is4k);
      const reason = req.body?.reason as RemovalRequestReason;
      if (!Object.values(RemovalRequestReason).includes(reason)) {
        return next({ status: 400, message: 'Invalid removal reason.' });
      }

      const media = await getRepository(Media).findOne({
        where: { id: mediaId },
      });
      if (!media) {
        return next({ status: 404, message: 'Media not found.' });
      }
      const isAdmin = req.user.hasPermission(Permission.ADMIN);
      if (
        !isAdmin &&
        media[is4k ? 'status4k' : 'status'] !== MediaStatus.AVAILABLE &&
        media[is4k ? 'status4k' : 'status'] !== MediaStatus.PARTIALLY_AVAILABLE
      ) {
        return next({ status: 409, message: 'Media is not available.' });
      }

      const participation = await getRepository(
        MediaRequestParticipant
      ).findOne({
        where: {
          request: { media: { id: mediaId }, is4k },
          user: { id: req.user.id },
        },
      });
      if (!participation && !isAdmin) {
        return next({
          status: 403,
          message: 'Only interested users can request removal.',
        });
      }

      const issueRepository = getRepository(Issue);
      const existing = await issueRepository.findOne({
        where: {
          media: { id: mediaId },
          createdBy: { id: req.user.id },
          issueType: IssueType.REMOVAL,
          status: IssueStatus.OPEN,
          removalIs4k: is4k,
        },
      });
      if (existing) {
        return next({ status: 409, message: 'Removal request already open.' });
      }

      const details = String(req.body?.message ?? '').trim();
      const issue = await issueRepository.save(
        new Issue({
          createdBy: req.user,
          issueType: IssueType.REMOVAL,
          status: IssueStatus.OPEN,
          removalReason: reason,
          removalIs4k: is4k,
          media,
          comments: [
            new IssueComment({
              user: req.user,
              message: `Removal requested: ${removalReasonLabels[reason]}${
                details ? `\n\n${details}` : ''
              }`,
            }),
          ],
        })
      );
      return res.status(201).json(issue);
    } catch (error) {
      return next({
        status: 500,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

const decideRemovalRequest = async (
  req: Request,
  res: Response,
  next: NextFunction,
  decision: RemovalRequestDecision
) => {
  try {
    if (!req.user?.hasPermission(Permission.ADMIN)) {
      return next({ status: 403, message: 'Administrator access required.' });
    }
    const repository = getRepository(Issue);
    const issue = await repository.findOne({
      where: { id: Number(req.params.issueId) },
      relations: { comments: true, media: { seasons: true } },
    });
    if (!issue || issue.issueType !== IssueType.REMOVAL) {
      return next({ status: 404, message: 'Removal request not found.' });
    }
    if (issue.status !== IssueStatus.OPEN) {
      return next({ status: 409, message: 'Removal request already decided.' });
    }

    if (decision === RemovalRequestDecision.APPROVED) {
      await removeMediaFromService(issue.media, issue.removalIs4k);
    }
    issue.status = IssueStatus.RESOLVED;
    issue.removalDecision = decision;
    issue.modifiedBy = req.user;
    issue.comments.push(
      new IssueComment({
        user: req.user,
        message:
          decision === RemovalRequestDecision.APPROVED
            ? 'Removal approved. Content removed from Radarr/Sonarr.'
            : `Removal rejected.${
                req.body?.message ? ` ${String(req.body.message)}` : ''
              }`,
      })
    );
    return res.json(await repository.save(issue));
  } catch (error) {
    return next({
      status: 500,
      message: error instanceof Error ? error.message : String(error),
    });
  }
};

seerrPlusRoutes.post('/removal-requests/:issueId/approve', (req, res, next) =>
  decideRemovalRequest(req, res, next, RemovalRequestDecision.APPROVED)
);

seerrPlusRoutes.post('/removal-requests/:issueId/reject', (req, res, next) =>
  decideRemovalRequest(req, res, next, RemovalRequestDecision.REJECTED)
);

seerrPlusRoutes.get('/settings', (_req, res) => {
  const settings = getSettings();
  return res.status(200).json(settings.seerrplus);
});

seerrPlusRoutes.post('/settings', async (req, res, next) => {
  if (!req.user?.hasPermission(Permission.ADMIN)) {
    return next({
      status: 403,
      message: 'You do not have permission to modify settings.',
    });
  }
  const settings = getSettings();
  const updateData = { ...req.body };
  if (updateData.removalVoteQuorum !== undefined) {
    updateData.removalVoteQuorum = Number(updateData.removalVoteQuorum);
  }
  if (updateData.removalVoteGracePeriodDays !== undefined) {
    updateData.removalVoteGracePeriodDays = Number(
      updateData.removalVoteGracePeriodDays
    );
  }
  settings.seerrplus = merge(settings.seerrplus, updateData);
  await settings.save();
  return res.status(200).json(settings.seerrplus);
});

export default seerrPlusRoutes;
