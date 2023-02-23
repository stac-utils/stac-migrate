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
        const legacy1 = loadJson('legacy/item-minimal.json');
        const latest1 = loadJson('latest/item-minimal.json');
        const legacy2 = loadJson('legacy/item-sample.json');
        const latest2 = loadJson('latest/item-sample.json');
        const legacy = {type: "FeatureCollection", features: [legacy1, legacy2]};
        const latest = {type: "FeatureCollection", features: [latest1, latest2], links: []};

        expect(Migrate.itemCollection(legacy)).toEqual(latest);
        expect(Migrate.stac(legacy)).toEqual(latest);
    });
});