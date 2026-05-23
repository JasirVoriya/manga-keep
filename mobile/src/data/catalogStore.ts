import type { ComicCatalog } from '../types';
import { loadLocalCatalogDefinitions } from '../storage/localCatalogStorage';
import { createCatalogFromDefinition } from './catalogHelpers';
import { defaultCatalog } from './catalogs';
import { loadConfiguredCatalogs } from './catalogRegistry';

export type CatalogLoadResult = {
  catalogs: ComicCatalog[];
  publicCatalogLoadFailed: boolean;
};

export function mergeCatalogLists(options: {
  localCatalogs: ComicCatalog[];
  publicCatalogs: ComicCatalog[];
  bundledCatalogs: ComicCatalog[];
}) {
  const catalogsById = new Map<string, ComicCatalog>();

  for (const catalog of options.bundledCatalogs) {
    catalogsById.set(catalog.id, catalog);
  }
  for (const catalog of options.publicCatalogs) {
    catalogsById.set(catalog.id, catalog);
  }
  for (const catalog of options.localCatalogs) {
    catalogsById.set(catalog.id, catalog);
  }

  return [...catalogsById.values()].sort((first, second) => {
    const rankDifference = catalogSourceRank(first) - catalogSourceRank(second);
    if (rankDifference !== 0) {
      return rankDifference;
    }
    return first.name.localeCompare(second.name, 'zh-Hans-CN');
  });
}

export async function loadCatalogStore(): Promise<CatalogLoadResult> {
  const localDefinitions = await loadLocalCatalogDefinitions();
  const localCatalogs = localDefinitions.map(createCatalogFromDefinition);

  try {
    const publicCatalogs = await loadConfiguredCatalogs({ fallbackToBundled: false });
    const bundledCatalogs = publicCatalogs.length === 0 && localCatalogs.length === 0 ? [defaultCatalog] : [];

    return {
      catalogs: mergeCatalogLists({
        localCatalogs,
        publicCatalogs,
        bundledCatalogs,
      }),
      publicCatalogLoadFailed: false,
    };
  } catch {
    return {
      catalogs: mergeCatalogLists({
        localCatalogs,
        publicCatalogs: [],
        bundledCatalogs: [defaultCatalog],
      }),
      publicCatalogLoadFailed: true,
    };
  }
}

function catalogSourceRank(catalog: ComicCatalog) {
  switch (catalog.source.type) {
    case 'local':
      return 0;
    case 'remote':
      return 1;
    case 'bundled':
      return 2;
  }
}
