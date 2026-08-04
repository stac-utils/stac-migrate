const Migrate = require('../migrate');
const fs = require('fs');

function loadJson(path) {
  return JSON.parse(fs.readFileSync('./tests/' + path));
}

describe('STAC Migrations', () => {
  const files = fs.readdirSync('tests/legacy/');
  for (let file of files) {
    if (!file.includes('.')) {
      continue; // Ignore directories
    }
    const latest = loadJson('latest/' + file);
    test(`${file} - update version number`, () => {
      const legacy = loadJson('legacy/' + file);
      const migrated = Migrate.stac(legacy, true);
      expect(migrated.stac_version).toEqual(latest.stac_version);
      expect(migrated).toEqual(latest);
    });
    test(`${file} - keep version number`, () => {
      const legacy = loadJson('legacy/' + file);
      latest.stac_version = legacy.stac_version;
      const migrated = Migrate.stac(legacy, false);
      expect(migrated.stac_version).toEqual(legacy.stac_version);
      expect(migrated).toEqual(latest);
    });
  }

  const latestItem = loadJson('latest/commons/item-sar-commons.json');
  test('Commons Extension from 0.6', () => {
    const legacyItem = loadJson('legacy/commons/item-sar-commons-0.6.json');
    const legacyCollection06 = loadJson('legacy/collection-sar-0.6.json');
    expect(Migrate.item(legacyItem, legacyCollection06)).toEqual(latestItem);
  });

  test('Commons Extension from 0.9', () => {
    const legacyItem = loadJson('legacy/commons/item-sar-commons-0.9.json');
    const legacyCollection09 = loadJson('legacy/collection-sar-0.9.json');
    expect(Migrate.item(legacyItem, legacyCollection09)).toEqual(latestItem);
  });

  test('ItemCollection', () => {
    const items = ['item-minimal', 'item-sample'];
    const getLegacy = () => {
      const legacyItem = items.map((id) => loadJson(`legacy/${id}.json`));
      return { type: 'FeatureCollection', features: legacyItem };
    };
    const latestItems = items.map((id) => loadJson(`latest/${id}.json`));
    const latest = {
      type: 'FeatureCollection',
      features: latestItems,
      links: [],
    };

    expect(Migrate.itemCollection(getLegacy())).toEqual(latest);
    expect(Migrate.stac(getLegacy())).toEqual(latest);
  });

  test('CollectionCollection', () => {
    const collections = [
      'collection-assets',
      'collection-bands',
      'collection-openeo-gee',
      'collection-other',
      'collection-sar-0.6',
      'collection-sar-0.9',
    ];
    const getLegacy = () => {
      const legacyCollections = collections.map((id) => loadJson(`legacy/${id}.json`));
      return { collections: legacyCollections };
    };
    const latestCollections = collections.map((id) => loadJson(`latest/${id}.json`));
    const latest = { collections: latestCollections, links: [] };

    expect(Migrate.collectionCollection(getLegacy())).toEqual(latest);
    expect(Migrate.stac(getLegacy())).toEqual(latest);
  });
});

describe('Checksum migration', () => {
  const legacyItem = (assetField, value) => ({
    stac_version: '0.6.0',
    type: 'Feature',
    id: 'item',
    geometry: null,
    properties: { datetime: '2016-05-03T13:22:30.040Z' },
    assets: {
      data: { href: 'http://example.com/data.tif', [assetField]: value },
    },
  });

  const migratedChecksum = (assetField, value) =>
    Migrate.item(legacyItem(assetField, value)).assets.data['file:checksum'];

  test('checksum:md5 -> file:checksum multihash', () => {
    expect(migratedChecksum('checksum:md5', 'd41d8cd98f00b204e9800998ecf8427e')).toEqual(
      'd50110d41d8cd98f00b204e9800998ecf8427e',
    );
  });

  test('checksum:sha1 -> file:checksum multihash', () => {
    expect(migratedChecksum('checksum:sha1', 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3')).toEqual(
      '1114a94a8fe5ccb19ba61c4c0873d391e987982fbbd3',
    );
  });

  test('checksum:sha2 -> file:checksum multihash (assumed sha2-256)', () => {
    expect(
      migratedChecksum('checksum:sha2', '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08'),
    ).toEqual('12209f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08');
  });

  test('checksum:sha3 -> file:checksum multihash (assumed sha3-256)', () => {
    expect(
      migratedChecksum('checksum:sha3', 'a7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a'),
    ).toEqual('1620a7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a');
  });
});
