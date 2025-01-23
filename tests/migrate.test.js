const Migrate = require("../migrate");
const fs = require("fs");

Migrate.enableMultihash(require("multihashes"));

function loadJson(path) {
  return JSON.parse(fs.readFileSync("./tests/" + path));
}

describe("STAC Migrations", () => {
  const files = fs.readdirSync("tests/legacy/");
  for (let file of files) {
    if (!file.includes(".")) {
      continue; // Ignore directories
    }
    const latest = loadJson("latest/" + file);
    test(`${file} - update version number`, () => {
      const legacy = loadJson("legacy/" + file);
      const migrated = Migrate.stac(legacy, true);
      expect(migrated.stac_version).toEqual(latest.stac_version);
      expect(migrated).toEqual(latest);
    });
    test(`${file} - keep version number`, () => {
      const legacy = loadJson("legacy/" + file);
      latest.stac_version = legacy.stac_version;
      const migrated = Migrate.stac(legacy, false);
      expect(migrated.stac_version).toEqual(legacy.stac_version);
      expect(migrated).toEqual(latest);
    });
  }

  const latestItem = loadJson("latest/commons/item-sar-commons.json");
  test("Commons Extension from 0.6", () => {
    const legacyItem = loadJson("legacy/commons/item-sar-commons-0.6.json");
    const legacyCollection06 = loadJson("legacy/collection-sar-0.6.json");
    expect(Migrate.item(legacyItem, legacyCollection06)).toEqual(latestItem);
  });

  test("Commons Extension from 0.9", () => {
    const legacyItem = loadJson("legacy/commons/item-sar-commons-0.9.json");
    const legacyCollection09 = loadJson("legacy/collection-sar-0.9.json");
    expect(Migrate.item(legacyItem, legacyCollection09)).toEqual(latestItem);
  });

  test("ItemCollection", () => {
    const items = ["item-minimal", "item-sample"];
    const getLegacy = () => {
      const legacyItem = items.map((id) => loadJson(`legacy/${id}.json`));
      return { type: "FeatureCollection", features: legacyItem };
    };
    const latestItems = items.map((id) => loadJson(`latest/${id}.json`));
    const latest = {
      type: "FeatureCollection",
      features: latestItems,
      links: [],
    };

    expect(Migrate.itemCollection(getLegacy())).toEqual(latest);
    expect(Migrate.stac(getLegacy())).toEqual(latest);
  });

  test("CollectionCollection", () => {
    const collections = [
      "collection-assets",
      "collection-bands",
      "collection-openeo-gee",
      "collection-other",
      "collection-sar-0.6",
      "collection-sar-0.9",
    ];
    const getLegacy = () => {
      const legacyCollections = collections.map((id) =>
        loadJson(`legacy/${id}.json`)
      );
      return { collections: legacyCollections };
    };
    const latestCollections = collections.map((id) =>
      loadJson(`latest/${id}.json`)
    );
    const latest = { collections: latestCollections, links: [] };

    expect(Migrate.collectionCollection(getLegacy())).toEqual(latest);
    expect(Migrate.stac(getLegacy())).toEqual(latest);
  });
});
