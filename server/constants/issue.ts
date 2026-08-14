export enum IssueType {
  VIDEO = 1,
  AUDIO = 2,
  SUBTITLES = 3,
  OTHER = 4,
  REMOVAL = 5,
}

export enum IssueStatus {
  OPEN = 1,
  RESOLVED = 2,
}

export const IssueTypeName = {
  [IssueType.AUDIO]: 'Audio',
  [IssueType.VIDEO]: 'Video',
  [IssueType.SUBTITLES]: 'Subtitle',
  [IssueType.OTHER]: 'Other',
  [IssueType.REMOVAL]: 'Removal Request',
};

export enum RemovalRequestDecision {
  APPROVED = 1,
  REJECTED = 2,
}

export enum RemovalRequestReason {
  FREE_SPACE = 'free_space',
  NO_INTEREST = 'no_interest',
  OTHER = 'other',
}
