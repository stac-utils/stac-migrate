# stac-migrate

A library to update STAC files to the latest version (**1.0.0** at the moment of writing). Supports updating **STAC versions 0.6.0 and later**.

Version of this library: **1.1.0**

## Usage

Add to your project with `npm install @radiantearth/stac-migrate --save`

Import the library: `const Migrate = require('@radiantearth/stac-migrate');`

* Migrate (auto-detection): `Migrate.stac(stac: object) => object`<br />
  *This method does not migrate the Commons extension - use `Migrate.item` if you have used the Commons extension.*
* Migrate a STAC Collection: `Migrate.collection(collection: object) => object`
* Migrate a STAC Catalog: `Migrate.catalog(catalog: object) => object`
* Migrate a STAC Item: `Migrate.item(item: object, collection: object = null) => object`<br />
  *The `collection` parameter is only required to migrate the Commons extension. Otherwise, you don't need to pass this paramater.*

**Note:** All changes will be applied in-place! If you don't want the input object to change, make a deep clone before. If you don't have a library which supports this (e.g. [lodash](https://lodash.com/docs/4.17.15#cloneDeep)) you can simply use `var clone = JSON.parse(JSON.stringify(object));`.

##  Supported Extensions

* Checksum (legacy, use `Migrate.enableMultihash(require('multihashes'))` to enable conversion from pre-0.9 checksums - disabled by default to keep the bundle size low)
* Classification 1.1.0
* Collection Assets (legacy)
* Commons (legacy)
* Data Cube 2.1.0
* Datetime Range (legacy)
* Electro-Optical 1.0.0
* File 1.0.0
* (Item) Asset Definition 1.0.0
* Label 1.0.1
* Point Cloud 1.0.0
* Procesing 1.1.0
* Projection 1.0.0
* Raster 1.1.0
* SAR 1.0.0
* Satellite 1.0.0
* Scientific Citation 1.0.0
* Single Item
* Table 1.2.0
* Timestamps 1.0.0
* Versioning Indicators 1.0.0
* View Geometry 1.0.0

## Development

Run the tests: `npm test`