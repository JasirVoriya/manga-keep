import type { ImageSourcePropType } from 'react-native';

export type OwnershipStatus = 'missing' | 'owned' | 'wishlist';

export type IssueCondition = 'ungraded' | 'mint' | 'good' | 'worn' | 'duplicate';

export type ComicCatalogKind = 'magazine' | 'series' | 'one-shot' | 'artbook' | 'special';

export type ComicCatalogSource =
  | {
      type: 'bundled';
    }
  | {
      type: 'remote';
      manifestUrl: string;
      sourceId?: string;
    }
  | {
      type: 'local';
      definition: StoredComicCatalogDefinition;
    };

export type ComicIssueKey = `${string}:${number}`;

export type ComicIssue = {
  key: ComicIssueKey;
  catalogId: string;
  number: number;
  sortNumber: number;
  label: string;
  displayTitle: string;
  coverUrl?: string;
  cover?: ImageSourcePropType;
};

export type ComicCatalog = {
  id: string;
  name: string;
  shortName: string;
  kind: ComicCatalogKind;
  description?: string;
  issueCount: number;
  numberPadding: number;
  source: ComicCatalogSource;
  issues: ComicIssue[];
};

export type StoredComicCatalogDefinition = {
  schemaVersion: 1;
  id: string;
  name: string;
  shortName: string;
  kind: ComicCatalogKind;
  description?: string;
  issueCount: number;
  numberPadding: number;
  coverPattern?: string;
  createdAt: string;
  updatedAt: string;
};

export type CatalogSourceConfig = { id: string; registryUrl: string; priority: number };

export type RemoteComicCatalogRegistry = {
  schemaVersion: 1;
  updatedAt?: string;
  redirectUrl?: string;
  catalogs: RemoteComicCatalogRegistryEntry[];
};

export type RemoteComicCatalogRegistryEntry = {
  id: string;
  name: string;
  shortName?: string;
  kind: ComicCatalogKind;
  description?: string;
  manifestUrl: string;
};

export type RemoteComicCatalogManifest = {
  schemaVersion: 1;
  id: string;
  name: string;
  shortName?: string;
  kind: ComicCatalogKind;
  description?: string;
  issueCount: number;
  numberPadding?: number;
  coverBaseUrl?: string;
  coverPattern?: string;
  issues?: RemoteComicIssue[];
};

export type RemoteComicIssue = {
  number: number;
  sortNumber?: number;
  label?: string;
  displayTitle?: string;
  coverUrl?: string;
};

export type IssueRecord = {
  status: OwnershipStatus;
  condition: IssueCondition;
  note: string;
  updatedAt: string;
};

export type IssueRecordMap = Record<ComicIssueKey, IssueRecord>;

export type IssueFilter = 'all' | 'owned' | 'missing' | 'wishlist';
