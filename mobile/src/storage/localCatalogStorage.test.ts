import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  catalogDefinitionFromInput,
  exportCatalogDefinition,
  findCatalogConflict,
  normalizeCatalogDefinitions,
  parseImportedCatalogDefinition,
} from './localCatalogStorage';
import type { StoredComicCatalogDefinition } from '../types';

const validDefinition: StoredComicCatalogDefinition = {
  schemaVersion: 1,
  id: 'comic-world',
  name: '漫画世界',
  shortName: '漫世',
  kind: 'magazine',
  issueCount: 300,
  numberPadding: 3,
  coverPattern: 'https://img.example.test/comic-world/{padded}.webp',
  createdAt: '2026-05-23T00:00:00.000Z',
  updatedAt: '2026-05-23T00:00:00.000Z',
};

describe('local catalog storage', () => {
  it('normalizes valid catalog definitions', () => {
    assert.deepEqual(normalizeCatalogDefinitions([validDefinition]), [validDefinition]);
  });

  it('rejects unsafe catalog IDs and non-positive issue counts', () => {
    assert.deepEqual(
      normalizeCatalogDefinitions([
        { ...validDefinition, id: '../comic-world' },
        { ...validDefinition, issueCount: 0 },
      ]),
      [],
    );
  });

  it('rejects invalid optional descriptions', () => {
    assert.deepEqual(normalizeCatalogDefinitions([{ ...validDefinition, description: false }]), []);
  });

  it('builds a catalog definition from input', () => {
    assert.deepEqual(
      catalogDefinitionFromInput(
        {
          id: ' comic-world ',
          name: ' 漫画世界 ',
          shortName: ' ',
          kind: 'magazine',
          issueCount: '300',
          numberPadding: '3',
          coverPattern: ' https://img.example.test/comic-world/{padded}.webp ',
        },
        '2026-05-23T00:00:00.000Z',
      ),
      {
        ...validDefinition,
        shortName: '漫画世',
      },
    );
  });

  it('exports MangaKeep catalog backup envelopes', () => {
    const exported = JSON.parse(exportCatalogDefinition(validDefinition)) as {
      app: string;
      type: string;
      version: number;
      catalog: unknown;
    };

    assert.equal(exported.app, 'manga-keep');
    assert.equal(exported.type, 'catalog-definition');
    assert.equal(exported.version, 1);
    assert.deepEqual(exported.catalog, validDefinition);
  });

  it('round trips exported catalog definitions', () => {
    assert.deepEqual(parseImportedCatalogDefinition(exportCatalogDefinition(validDefinition)), validDefinition);
  });

  it('rejects legacy manga-shelf catalog backup envelopes', () => {
    assert.throws(
      () =>
        parseImportedCatalogDefinition(
          JSON.stringify({
            app: 'manga-shelf',
            type: 'catalog-definition',
            version: 1,
            catalog: validDefinition,
          }),
        ),
      /manga-keep/,
    );
  });

  it('finds catalog conflicts by ID', () => {
    assert.equal(findCatalogConflict([validDefinition], 'missing'), null);
    assert.deepEqual(findCatalogConflict([validDefinition], 'comic-world'), validDefinition);
  });
});
