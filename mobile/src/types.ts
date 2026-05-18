import type { ImageSourcePropType } from 'react-native';

export type OwnershipStatus = 'missing' | 'owned' | 'wishlist';

export type IssueCondition = 'ungraded' | 'mint' | 'good' | 'worn' | 'duplicate';

export type ComicIssue = {
  number: number;
  label: string;
  displayTitle: string;
  cover?: ImageSourcePropType;
};

export type IssueRecord = {
  status: OwnershipStatus;
  condition: IssueCondition;
  note: string;
  updatedAt: string;
};

export type IssueRecordMap = Record<number, IssueRecord>;

export type IssueFilter = 'all' | 'owned' | 'missing' | 'wishlist';

