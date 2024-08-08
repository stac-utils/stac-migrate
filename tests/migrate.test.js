const Migrate = require('../migrate');
const fs = require('fs');
const path = require('path');

Migrate.enableMultihash(require('multihashes'));

function loadJson(path) {
    return JSON.parse(fs.readFileSync('./tests/' + path));
}

describe('STAC Migrations', () => {
    const files = fs.readdirSync('tests/legacy/');
    for(let file of files) {
        if (!file.includes('.')) {
            continue; // Ignore directories
        }
        const legacy = loadJson('legacy/' + file);
        const latest = loadJson('latest/' + file);
        test(file, () => {
            expect(Migrate.stac(legacy)).toEqual(latest);
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
        const legacyItem = items.map(id => loadJson(`legacy/${id}.json`));
        const latestItems = items.map(id => loadJson(`latest/${id}.json`));
        const legacy = {type: "FeatureCollection", features: legacyItem};
        const latest = {type: "FeatureCollection", features: latestItems, links: []};

        expect(Migrate.itemCollection(legacy)).toEqual(latest);
        expect(Migrate.stac(legacy)).toEqual(latest);
    });

    test('CollectionCollection', () => {
        const collections = [
          'collection-assets',
          'collection-bands',
          'collection-openeo-gee',
          'collection-other',
          'collection-sar-0.6',
          'collection-sar-0.9'
        ];
        const legacyCollections = collections.map(id => loadJson(`legacy/${id}.json`));
        const latestCollections = collections.map(id => loadJson(`latest/${id}.json`));
        const legacy = {collections: legacyCollections};
        const latest = {collections: latestCollections, links: []};

        expect(Migrate.collectionCollection(legacy)).toEqual(latest);
        expect(Migrate.stac(legacy)).toEqual(latest);
    });
});
