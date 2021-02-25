// Migration rules partly based on PySTAC and @openeo/js-commons,
// see https://github.com/stac-utils/pystac/tree/v0.5.4/pystac/serialization/migrate.py
// and https://github.com/Open-EO/openeo-js-commons/tree/v1.2.0/src/migrate/collections.js

var compareVersions = require('compare-versions');

const LATEST_VERSION = '1.0.0-beta.2';

var V = {
	version: LATEST_VERSION,

	set(version) {
		if (!version) {
			version = '0.6.0'; // Assume the worst case, it doesn't seem there's a clear indicator for 0.7.0
		}
		V.version = version;
	},

	before(version) {
		return compareVersions.compare(V.version, version, '<');
	}
};

var _ = {

	type(val) {
		let type = typeof val;
		if (type === 'object') {
			if (val === null) {
				return 'null';
			}
			else if (Array.isArray(val)) {
				return 'array';
			}
		}
		return type;
	},

	is(val, type) {
		return (_.type(val) === type);
	},

	isDefined(val) {
		return (typeof val !== 'undefined');
	},

	isObject(obj) {
		return (typeof obj === 'object' && obj === Object(obj) && !Array.isArray(obj));
	},

	rename(obj, oldKey, newKey) {
		if (typeof obj[oldKey] !== 'undefined' && typeof obj[newKey] === 'undefined') {
			obj[newKey] = obj[oldKey];
			delete obj[oldKey];
			return true;
		}
		return false;
	},

	toArray(obj, key) {
		if (typeof obj[key] !== 'undefined' && !Array.isArray(obj[key])) {
			obj[key] = [obj[key]];
			return true;
		}
		return false;
	},

	flattenArray(obj, key, newKeys, summary = false) {
		if (Array.isArray(obj[key])) {
			for(let i in obj[key]) {
				if (typeof newKeys[i] === 'string') {
					let value = obj[key][i];
					obj[newKeys[i]] = summary ? [value] : value;
				}
			}
			delete obj[key];
			return true;
		}
		return false;
	},

	removeFromArray(obj, key, valueToRemove) {
		if (Array.isArray(obj[key])) {
			let index = obj[key].indexOf(valueToRemove);
			if (index > -1) {
				obj[key].splice(index, 1);
			}
		}
	},

	ensure(obj, key, defaultValue) {
		if (_.type(defaultValue) !== _.type(obj[key])) {
			obj[key] = defaultValue;
		}
	},

	mapValues(obj, key, oldValues, newValues) {
		let fn = value => {
			let index = oldValues.indexOf(value);
			if (index >= 0) {
				return newValues[index];
			}
			return value;	
		};
		if (Array.isArray(obj[key])) {
			obj[key] = obj[key].map(fn);
		}
		else if (typeof obj[key] !== 'undefined') {
			obj[key] = fn(obj[key]);
		}
		return true;
	},

	moveTo(obj, key, context, fromSummary = false, mergedSummary = false) {
		if (fromSummary) {
			if (mergedSummary) {
				condition = val => Array.isArray(val);
			}
			else {
				condition = val => Array.isArray(val) && val.length === 1;
			}
		}
		else {
			condition = _.isDefined
		}
		if (condition(obj[key])) {
			context[key] = fromSummary && !mergedSummary ? obj[key][0] : obj[key];
			delete obj[key];
		}
	},

	runAll(migrations, obj, context = undefined) {
		for(let fn in migrations) {
			if (!fn.startsWith('migrate')) {
				migrations[fn](obj, context);
			}
		}
	}

};

var Checksum = {

	hexToUint8(hexString) {
		if(hexString.length === 0 || hexString.length % 2 !== 0){
			throw new Error(`The string "${hexString}" is not valid hex.`)
		}
  		return new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
	},

	uint8ToHex(bytes) {
		return bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');
	},

	toMultihash(hash, algo) {
		try {
			const multihash = require('multihashes');
			const meta = multihash.encode(_.hexToUint8(hash), algo);
			return _.uint8ToHex(meta.digest);
		} catch (error) {
			console.warn(error);
		}
	}

};

var Catalog = {

	migrate(catalog) {
		V.set(catalog.stac_version);
		catalog.stac_version = LATEST_VERSION;
		// ToDo: Populate stac_extensions

		_.runAll(Catalog, catalog);
	}

};

var Collection = {

	migrate(collection) {
		Catalog.migrate(collection); // Migrates stac_version, id, title, description, links

		_.mapValues(collection, 'stac_extensions', ['assets'], ['item-assets']); // Rename extension
		// ToDo: Populate stac_extensions

		_.runAll(Collection, collection);

		// Migrate Commons extension - part 3
		if (_.isObject(collection.properties)) {
			_.removeFromArray(collection, 'stac_extensions', 'commons');
			delete collection.properties;
		}
	},

	extent(collection) {
		if (V.before('0.8.0')) {
			// Add missing extent upfront. Makes the following code simpler as it works on the object.
			_.ensure(collection, 'extent', {});
			// Restructure spatial extent
			if (Array.isArray(collection.extent.spatial)) {
				collection.extent.spatial = {
					bbox: [
						collection.extent.spatial
					]
				};
			}
			// Restructure temporal extent
			if (Array.isArray(collection.extent.temporal)) {
				collection.extent.temporal = {
					interval: [
						collection.extent.temporal
					]
				};
			}
		}
	},

	collectionAssets(collection) {
		// Nothing to do
	},

	itemAsset(collection) {
		V.before('1.0.0-beta.2') && _.rename(collection, 'item_assets', 'assets');
	},

	summaries(collection) {
		_.ensure(collection, 'summaries', {});

		// Migrate Commons extension - part 2
		// Move properties to (single element) summaries
		if (V.before('0.8.0') && _.isObject(collection.properties)) {
			for(let key in collection.properties) {
				let value = collection.properties[key];
				if (!Array.isArray(value)) {
					value = [value];
				}
				collection.summaries[key] = value;
			}
		}

		// other_properties: An early version of the Collection summaries with a similar structure
		// Was mostly used in standalone collctions from openEO and GEE. Move other_properties to summaries.
		if (V.before('0.8.0') && _.isObject(collection.other_properties)) {
			for(let key in collection.other_properties) {
				let prop = collection.other_properties[key];
				if (Array.isArray(prop.extent) && prop.extent.length === 2) {
					collection.summaries[key] = {
						min: prop.extent[0],
						max: prop.extent[1]
					};
				}
				else if (Array.isArray(prop.values)) {
					if (prop.values.filter(v => Array.isArray(v)).length === prop.values.length) {
						// If it is an array of arrays, merge the arrays
						collection.summaries[key] = prop.values.reduce((a, b) => a.concat(b), []);
					}
					else {
						collection.summaries[key] = prop.values;
					}
				}
			}
			delete collection.other_properties;
		}

		// now we can work on all summaries and migrate them
		Fields.migrate(collection.summaries, true);

		// Some fields should usually be on root-level if there's only one element
		_.moveTo(collection.summaries, 'sci:doi', collection, true);
		_.moveTo(collection.summaries, 'sci:publications', collection, true, true);
		_.moveTo(collection.summaries, 'sci:citation', collection, true);
		_.moveTo(collection.summaries, 'cube:dimensions', collection, true);

		// Remove summary field if empty
		if (Object.keys(collection.summaries).length === 0) {
			delete collection.summaries;
		}
	}

};

var Item = {

	migrate(item, collection = null) {
		V.set(item.stac_version);
		item.stac_version = LATEST_VERSION;

		_.mapValues(item, 'stac_extensions', ['dtr'], ['item-assets']); // Extension renames
		_.removeFromArray(item, 'stac_extensions', 'datetime-range'); // ToDo: Check whether this is actually required. When did dtr move to core?
		// ToDo: Populate stac_extensions

		_.runAll(Item, item);

		Fields.migrate(item.properties);
		Asset.migrateAll(item);

		// Migrate Commons extension - part 1
		if (_.isObject(collection) && _.isObject(collection.properties)) {
			_.removeFromArray(collection, 'stac_extensions', 'commons');
			item.properties = Object.assign({}, collection.properties, item.properties);
		}
	}

};

var Asset = {

	migrateAll(context) {
		for(let key in context.assets) {
			Asset.migrate(context.assets[key], context);
		}
	},

	migrate(asset, context) {
		_.runAll(Asset, asset, context);
		Fields.migrate(asset);
	},

	mediaTypes(asset) {
		_.is(asset.type, 'string') && V.before('0.8.0') && _.mapValues(
			asset, 'type',
			['image/vnd.stac.geotiff', 			'image/vnd.stac.geotiff; cloud-optimized=true'],
			['image/tiff; application=geotiff',	'image/tiff; application=geotiff; profile=cloud-optimized']
		);
	},

	eo(asset, context) {
		if (!Array.isArray(context.properties['eo:bands']) || !Array.isArray(asset['eo:bands'])) {
			return;
		}

		for(let i in asset['eo:bands']) {
			let band = asset['eo:bands'][i];
			if (_.is(band, 'number') && _.isObject(context.properties['eo:bands'][band])) {
				band = context.properties['eo:bands'][band];
			}
			else if (!_.isObject(band)) {
				band = {}; // "Fix" invalid band index
			}
			asset['eo:bands'][i] = band;
		}
	}

};

var Fields = {

	migrate(obj, summary = false) {
		_.runAll(Fields, obj, summary);
	},

	_commonMetadata(obj) {
		// Nothing to do
	},

	_timestamps(obj) {
		// Nothing to do
	},

	_versioningIndicator(obj) {
		// Nothing to do
	},

	checksum(obj) {
		if (V.before('0.9.0')) {
			_.rename(obj, 'checksum:md5', 'checksum:multihash') && Checksum.toMultihash(obj, 'checksum:multihash', 'md5');
			_.rename(obj, 'checksum:sha1', 'checksum:multihash') && Checksum.toMultihash(obj, 'checksum:multihash', 'sha1');
			_.rename(obj, 'checksum:sha2', 'checksum:multihash') && Checksum.toMultihash(obj, 'checksum:multihash', 'sha2');
			_.rename(obj, 'checksum:sha3', 'checksum:multihash') && Checksum.toMultihash(obj, 'checksum:multihash', 'sha3');
		}

		V.before('1.0.0-rc.1') && _.rename(obj, 'checksum:multihash', 'file:checksum');
	},

	cube() {
		// Nothing to do
	},

	dtr(obj) {
		V.before('0.9.0') && _.rename(obj, 'dtr:start_datetime', 'start_datetime');
		V.before('0.9.0') && _.rename(obj, 'dtr:end_datetime', 'end_datetime');
	},

	eo(obj) {
		if (V.before('0.9.0')) {
			_.rename(obj, 'eo:epsg', 'proj:epsg');
			_.rename(obj, 'eo:platform', 'platform');
			_.rename(obj, 'eo:instrument', 'instruments') && _.toArray(obj, 'instruments');
			_.rename(obj, 'eo:constellation', 'constellation');
			_.rename(obj, 'eo:off_nadir', 'view:off_nadir');
			_.rename(obj, 'eo:azimuth', 'view:azimuth');
			_.rename(obj, 'eo:incidence_angle', 'view:incidence_angle');
			_.rename(obj, 'eo:sun_azimuth', 'view:sun_azimuth');
			_.rename(obj, 'eo:sun_elevation', 'view:sun_elevation');
		}

		V.before('1.0.0-beta.1') && _.rename(obj, 'eo:gsd', 'gsd');
	},

	label(obj) {
        // Migrate 0.8.0-rc1 non-pluralized forms
		if (V.before('0.8.0')) {
			_.rename(obj, 'label:property', 'label:properties');
			_.rename(obj, 'label:task', 'label:tasks');
			_.rename(obj, 'label:overview', 'label:overviews') && _.toArray(obj, 'label:overviews');
			_.rename(obj, 'label:method', 'label:methods');
			_.toArray(obj, 'label:classes');
		}
	},

	pc(obj) {
		V.before('0.8.0') && _.rename(obj, 'pc:schema', 'pc:schemas');
	},

	proj(obj) {
		// Nothing to do
	},

	sar(obj, summary = false) {
		// Which version have they been (re)moved?
		_.rename(obj, 'sar:incidence_angle', 'view:incidence_angle');
		_.rename(obj, 'sar:relative_orbit', 'sat:relative_orbit');
		_.rename(obj, 'sar:pass_direction', 'sat:orbit_state') && _.mapValues(obj, 'sat:orbit_state', [null], ['geostationary']);

		if (V.before('0.7.0')) {
			_.flattenArray(obj, 'sar:resolution', ['sar:resolution_range', 'sar:resolution_azimuth'], summary);
			_.flattenArray(obj, 'sar:pixel_spacing', ['sar:pixel_spacing_range', 'sar:pixel_spacing_azimuth'], summary);
			_.flattenArray(obj, 'sar:looks', ['sar:looks_range', 'sar:looks_azimuth', 'sar:looks_equivalent_number'], summary);
			_.rename(obj, 'sar:off_nadir', 'view:off_nadir');
		}

		if (V.before('0.9.0')) {
			_.rename(obj, 'sar:platform', 'platform');
			_.rename(obj, 'sar:instrument', 'instruments') && _.toArray(obj, 'instruments');
			_.rename(obj, 'sar:constellation', 'constellation');
			_.rename(obj, 'sar:type', 'sar:product_type');
			_.rename(obj, 'sar:polarization', 'sar:polarizations');
			_.rename(obj, 'sar:absolute_orbit', 'sat:absolute_orbit');
		}
	},

	sat(obj) {
        // Migrate 0.9.0-rc _angle suffixes
		if (V.before('0.9.0')) {
			_.rename(obj, 'sat:off_nadir_angle', 'sat:off_nadir');
			_.rename(obj, 'sat:azimuth_angle', 'sat:azimuth');
			_.rename(obj, 'sat:sun_azimuth_angle', 'sat:sun_azimuth');
			_.rename(obj, 'sat:sun_elevation_angle', 'sat:sun_elevation');
		}
	},

	sci(obj) {
		// Nothing to do
	},

	item(obj) { // Single Item
		V.before('0.8.0') && _.rename(obj, 'item:license', 'license');
		V.before('0.8.0') && _.rename(obj, 'item:providers', 'providers');
	},

	view(obj) {
		// Nothing to do
	}

};

var Migrate = {

	item(item, collection = null) {
		Item.migrate(item, collection);
		return item;
	},
	
	catalog(catalog) {
		Catalog.migrate(catalog);
		return catalog;
	},
	
	collection(collection) {
		Collection.migrate(collection);
		return collection;
	},
	
	stac(object) {
		let type;
		if (object.type === 'Feature') {
			type = 'item';
		}
		else if (_.isDefined(object.extent) || _.isDefined(object.license)) {
			type = 'collection';
		}
		else {
			type = 'catalog';
		}
		return Migrate[type](object);
	}

};

module.exports = Migrate;