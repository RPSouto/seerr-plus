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
import { User } from '@server/entity/User';
import { Permission } from '@server/lib/permissions';
import {
  addRequestParticipant,
  getMediaRequesters,
  getPublicMediaRequesters,
  getRequestParticipants,
  removeRequestParticipant,
} from '@server/lib/seerrplus/requests';
import { removeMediaFromService } from '@server/lib/seerrplus/removals';
import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
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
          message: 'You cannot remove another user\'s interest.',
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
      const remainingParticipants = (
        await getRequestParticipants(requestId)
      ).length;
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
          statuses: [
            MediaRequestStatus.PENDING,
            MediaRequestStatus.APPROVED,
          ],
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
          message: 'You cannot remove another user\'s interest.',
        });
      }

      const participations = await getRepository(MediaRequestParticipant)
        .createQueryBuilder('participant')
        .innerJoinAndSelect('participant.request', 'request')
        .where('request.mediaId = :mediaId', { mediaId })
        .andWhere('request.is4k = :is4k', { is4k: false })
        .andWhere('request.status IN (:...statuses)', {
          statuses: [
            MediaRequestStatus.PENDING,
            MediaRequestStatus.APPROVED,
          ],
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
        media[is4k ? 'status4k' : 'status'] !==
          MediaStatus.PARTIALLY_AVAILABLE
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

export default seerrPlusRoutes;
