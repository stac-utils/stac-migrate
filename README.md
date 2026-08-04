# stac-migrate

A library to update STAC files to the latest version (**1.1.0** at the moment of writing).
Supports updating **STAC versions 0.6.0 and later**; documents without a `stac_version` are assumed to be 0.6.0.

Version of this library: ![NPM Version](https://img.shields.io/npm/v/%40radiantearth%2Fstac-migrate)

## Usage

### JavaScript / Node

Add to your project with `npm install @radiantearth/stac-migrate --save`

Import the library: `const Migrate = require('@radiantearth/stac-migrate');`

- Migrate (auto-detection): `Migrate.stac(stac: object, updateVersionNumber: boolean = true) => object`

  _This method does not migrate the Commons extension - use `Migrate.item` if you have used the Commons extension._

- Migrate a STAC Collection: `Migrate.collection(collection: object, updateVersionNumber: boolean = true) => object`
- Migrate a STAC Catalog: `Migrate.catalog(catalog: object, updateVersionNumber: boolean = true) => object`
- Migrate a STAC Item: `Migrate.item(item: object, collection: object = null, updateVersionNumber: boolean = true) => object`

  _The `collection` parameter is only required to migrate the Commons extension. Otherwise, you don't need to pass this paramater._

- Migrate a STAC CollectionCollection: `Migrate.collectionCollection(apiCollections: object, updateVersionNumber: boolean = true) => object`
- Migrate a STAC ItemCollection: `Migrate.itemCollection(apiItems: object, updateVersionNumber: boolean = true) => object`

**Note:** All changes will be applied in-place! If you don't want the input object to change, make a deep clone before. If you don't have a library which supports this (e.g. [lodash](https://lodash.com/docs/4.17.15#cloneDeep)) you can simply use `var clone = JSON.parse(JSON.stringify(object));`.

### CLI

You can also use the CLI to migrate a single file.
The commands follow the different methods above and has the same "restrictions" as above.

- Migrate (auto-detection, override): `npx stac-migrate <source_path>`
- Migrate (auto-detection, save to a different file with 4 spaces indentation): `npx stac-migrate <source_path> --dest <dest_path> --indent 4`
- Migrate a STAC Collection: `npx stac-migrate <source_path> --dest <dest_path> --collection`
- Migrate a STAC Catalog: `npx stac-migrate <source_path> --dest <dest_path> --catalog`
- Migrate a STAC Item: `npx stac-migrate <source_path> --dest <dest_path> --item --collection_path <collection_path>`
- Migrate a STAC Item Collection: `npx stac-migrate <source_path> --dest <dest_path> --item_collection`
- Migrate a STAC Collection Collection: `npx stac-migrate <source_path> --dest <dest_path> --collections`

## Supported Extensions

- Checksum (legacy)

  **Note:** Use `Migrate.enableMultihash(require('multihashes'))` to enable conversion from pre-0.9 checksums - disabled by default to keep the bundle size low

  _Pre-0.9 `checksum:sha2` / `checksum:sha3` are assumed to be `sha2-256` / `sha3-256`; other lengths convert incorrectly._

- CF 1.0.0
- Classification 2.0.0

  _A missing class `name` (required since 2.0.0) is filled from the class `description`._

- Collection Assets (legacy)
- Commons (legacy)

  _A non-standalone Collection (with `child`/`item` links) migrated on its own drops its shared `properties`; pass the Items via `Migrate.item(item, collection)` to keep them._

- Data Cube 2.3.0

  _A `cube:dimensions` `reference_system` given as a PROJ4 or WKT string is not converted to the 2.0.0 representation._

- Datetime Range (legacy)
- Electro-Optical 2.0.0

  _`eo:bands` and `raster:bands` are merged into `bands` (1.1.0) by array index, assuming matching order. Pre-1.0.0 index-based `eo:bands` are resolved against `properties.bands`._

- File 2.1.0 (and 1.0.0 for `nodata`)

  _`file:nodata` maps to the single-valued `nodata` (first value kept); extra values are copied to a non-standard `nodata:values`._

- Instruments 0.1.0
- Item Asset Definition 1.0.0 (legacy)
- Label 1.0.1
- Order 1.1.0
- Point Cloud 2.0.0

  _`pc:encoding` is not rewritten and left in place._

- Processing 1.2.0
- Product 1.0.0
- Projection 2.0.0
- Raster 2.0.0
- SAR 1.3.2
- Satellite 1.2.0
- Scientific Citation 1.0.0
- Single Item
- Table 1.2.0
- Timestamps 1.1.0
- Versioning Indicators 1.2.0
- View Geometry 1.1.0

## Unsupported Extensions

The following extensions are not migrated:

- Authentication

  _The removed scheme types `planetaryComputer` and `earthdata` (1.1.0) are not rewritten to `signedUrl`. They stay valid as custom `type` values._

- Storage

## Development

- Run the tests: `npm test`
- Run the linter: `npm run lint`
- Format the code: `npm run format`
