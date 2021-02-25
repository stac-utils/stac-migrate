# stac-migrate

A library to update STAC files to the latest version (**1.0.0-beta.2** at the moment of writing). Supports updating **STAC versions 0.6.0 and later**.

## Usage

Add to your project with `npm install @radiantearth/stac-migrate --save`

Import the library: `const Migrate = require('@radiantearth/stac-migrate');`

* Migrate (auto-detection): `Migrate.stac(stac: object) => object` - *this does not migrate the Commons extension - use `Migrate.item instead`*
* Migrate a STAC Collection: `Migrate.collection(collection: object) => object`
* Migrate a STAC Catalog: `Migrate.catalog(catalog: object) => object`
* Migrate a STAC Item: `Migrate.item(item: object, collection: object = null) => object`
  *The `collection` parameter is only required to migrate the Commons extension. Otherwise you don't need to pass this paramater.*

**Note:** All changes will be applied in-place! If you don't want the input object to change, make a deep clone before. If you don't have a library which supports this (e.g. [lodash](https://lodash.com/docs/4.17.15#cloneDeep)) you can simply use `var clone = JSON.parse(JSON.stringify(object));`.

##  Supported Extensions

* Checksum
* Collection Assets
* Commons
* Data Cube
* Datetime Range
* Electro-Optical
* (Item) Asset Definition
* Label
* Point Cloud
* Projection
* SAR
* Satellite
* Scientific
* Single Item
* Timestamps
* Versioning Indicators
* View Geometry

## Development

A number of helper functions are available:

- version_compare
- rename
- reformat
- move
- ...

### Roadmap

- Support filling the `stac_extensions` field