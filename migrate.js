// Migration rules partly based on PySTAC and @openeo/js-commons,
// see https://github.com/stac-utils/pystac/tree/v0.5.4/pystac/serialization/migrate.py
// and https://github.com/Open-EO/openeo-js-commons/tree/v1.2.0/src/migrate/collections.js

var compareVersions = require('compare-versions');

const LATEST_VERSION = '1.0.0';
const DONE = true; // This is used to verify in code coverage whether something has been used or not
const SCHEMAS = {
	'datacube': 'https://stac-extensions.github.io/datacube/v1.0.0/schema.json',
	'eo': 'https://stac-extensions.github.io/eo/v1.0.0/schema.json',
	'file': 'https://stac-extensions.github.io/file/v1.0.0/schema.json',
	'item-assets': 'https://stac-extensions.github.io/item-assets/v1.0.0/schema.json',
	'label': 'https://stac-extensions.github.io/label/v1.0.0/schema.json',
	'pointcloud': 'https://stac-extensions.github.io/pointcloud/v1.0.0/schema.json',
	'processing': 'https://stac-extensions.github.io/processing/v1.0.0/schema.json',
	'projection': 'https://stac-extensions.github.io/projection/v1.0.0/schema.json',
	'raster': 'https://stac-extensions.github.io/raster/v1.0.0/schema.json',
	'sar': 'https://stac-extensions.github.io/sar/v1.0.0/schema.json',
	'sat': 'https://stac-extensions.github.io/sat/v1.0.0/schema.json',
	'scientific': 'https://stac-extensions.github.io/scientific/v1.0.0/schema.json',
	'timestamps': 'https://stac-extensions.github.io/timestamps/v1.0.0/schema.json',
	'version': 'https://stac-extensions.github.io/version/v1.0.0/schema.json',
	'view': 'https://stac-extensions.github.io/view/v1.0.0/schema.json'
};
const EXTENSIONS = {
	// Add a : at the end to indicate it has a prefix, otherwise list all fields separately (see version extension for example).
	itemAndCollection: {
		// with prefix
		'cube:': SCHEMAS.datacube,
		'eo:': SCHEMAS.eo,
		'file:': SCHEMAS.file,
		'label:': SCHEMAS.label,
		'pc:': SCHEMAS.pointcloud,
		'processing:': SCHEMAS.processing,
		'proj:': SCHEMAS.projection,
		'raster:': SCHEMAS.raster,
		'sar:': SCHEMAS.sar,
		'sat:': SCHEMAS.sat,
		'sci:': SCHEMAS.scientific,
		'view:': SCHEMAS.view,
		// without prefix
		'version': SCHEMAS.version,
		'deprecated': SCHEMAS.version,
		'published': SCHEMAS.timestamps,
		'expires': SCHEMAS.timestamps,
		'unpublished': SCHEMAS.timestamps
	},
	catalog: {
		// None yet
	},
	collection: {
		'item_assets': SCHEMAS['item-assets']
	},
	item: {
		// None yet
	},
};
EXTENSIONS.collection = Object.assign(EXTENSIONS.collection, EXTENSIONS.itemAndCollection);
EXTENSIONS.item = Object.assign(EXTENSIONS.item, EXTENSIONS.itemAndCollection);

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

	flattenOneElementArray(obj, key, summary = false) {
		if (!summary && Array.isArray(obj[key])) {
			if (obj[key].length === 1) {
				obj[key] = obj[key][0];
				return true;
			}
			else {
				return false; // It's still an array and we don't know which element to choose
			}
		}
		return true; // It's already a single element
	},

	removeFromArray(obj, key, valueToRemove) {
		if (Array.isArray(obj[key])) {
			let index = obj[key].indexOf(valueToRemove);
			if (index > -1) {
				obj[key].splice(index, 1);
			}
			return true;
		}
		return false;
	},

	addToArrayIfNotExists(obj, key, valueToAdd) {
		if (Array.isArray(obj[key])) {
			let index = obj[key].indexOf(valueToAdd);
			if (index === -1) {
				obj[key].push(valueToAdd);
			}
			obj[key].sort();
			return true;
		}
		return false;
	},

	ensure(obj, key, defaultValue) {
		if (_.type(defaultValue) !== _.type(obj[key])) {
			obj[key] = defaultValue;
		}
		return true;
	},

	addExtension(context, newExtension) {
		if (!_.isObject(context)) {
			return true; // We are likely in summaries and don't need to do anything
		}

		return _.addToArrayIfNotExists(context, 'stac_extensions', newExtension) && DONE;
	},

	removeExtension(context, oldExtension) {
		if (!_.isObject(context)) {
			return true; // We are likely in summaries and don't need to do anything
		}

		return _.removeFromArray(context, 'stac_extensions', oldExtension) && DONE;
	},

	migrateExtensionShortnames(context) {
		let oldShortnames = Object.keys(SCHEMAS);
		let newSchemas = Object.values(SCHEMAS);
		return _.mapValues(context, 'stac_extensions', oldShortnames, newSchemas);
	},

	populateExtensions(context, type) {
		let objectsToCheck = [];
		if (type == 'catalog' || type == 'collection') {
			objectsToCheck.push(context);
		}
		if ((type == 'item' || type == 'collection') && _.isObject(context.assets)) {
			objectsToCheck = objectsToCheck.concat(Object.values(context.assets));
		}
		if (type == 'collection' && _.isObject(context.item_assets)) {
			objectsToCheck = objectsToCheck.concat(Object.values(context.item_assets));
		}
		if (type == 'collection' && _.isObject(context.summaries)) {
			objectsToCheck = objectsToCheck.concat(Object.values(context.summaries));
		}
		if (type == 'item' && _.isObject(context.properties)) {
			objectsToCheck.push(context.properties);
		}

		for (let obj of objectsToCheck) {
			Object.keys(obj).forEach(key => {
				let prefix = key.match(/^(\w+:|[^:]+$)/i);
				if (Array.isArray(prefix)) {
					let ext = EXTENSIONS[type][prefix[0]];
					_.is(ext, 'string') && _.addExtension(context, ext) && DONE;
				}
			});
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

	mapObject(obj, fn) {
		for(let key in obj) {
			obj[key] = fn(obj[key], key);
		}
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
			return true;
		}
		return false;
	},

	runAll(migrations, obj, context = null) {
		for(let fn in migrations) {
			if (!fn.startsWith('migrate')) {
				migrations[fn](obj, context);
			}
		}
	},

	toUTC(obj, key) {
		if (typeof obj[key] === 'string') {
			try {
				obj[key] = this.toISOString(obj[key]);
				return true;
			} catch(error) {}
		}
		delete obj[key];
		return false;
	},

	toISOString(date) {
		if (!(date instanceof Date)) {
			date = new Date(date);
		}
		return date.toISOString().replace('.000', ''); // Don't export milliseconds if not needed
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

	toMultihash(obj, key, algo) {
		if (!_.is(obj[key], 'string')) {
			return false;
		}
		try {
			const multihash = require('multihashes');
			const encoded = multihash.encode(Checksum.hexToUint8(obj[key]), algo);
			obj[key] = Checksum.uint8ToHex(encoded);
			return true;
		} catch (error) {
			console.warn(error);
			return false;
		}
	}

};

var Catalog = {

	migrate(catalog, updateVersionNumber = true) {
		V.set(catalog.stac_version);
		if (updateVersionNumber) {
			catalog.stac_version = LATEST_VERSION;
		}
		catalog.type = 'Catalog';
		V.before('1.0.0-rc.1') && _.migrateExtensionShortnames(catalog) && DONE;

		_.ensure(catalog, 'id', '') && DONE;
		_.ensure(catalog, 'description', '') && DONE;
		_.ensure(catalog, 'links', []) && DONE;

		_.runAll(Catalog, catalog, catalog);

		_.ensure(catalog, 'stac_extensions', []) && DONE;
		V.before('0.8.0') && _.populateExtensions(catalog, 'catalog') && DONE;
	},

	openeo(obj) {
		_.rename(obj, 'api_version', 'openeo:api_version') && DONE;
		_.rename(obj, 'backend_version', 'openeo:backend_version') && DONE;
		_.rename(obj, 'production', 'openeo:production') && DONE;
		_.rename(obj, 'endpoints', 'openeo:endpoints') && DONE;
		_.rename(obj, 'billing', 'openeo:billing') && DONE;
	},

};

var Collection = {

	migrate(collection, updateVersionNumber = true) {
		Catalog.migrate(collection, updateVersionNumber); // Migrates stac_version, stac_extensions, id, title, description, links
		collection.type = 'Collection';
		V.before('1.0.0-rc.1') && _.migrateExtensionShortnames(collection) && DONE;

		_.ensure(collection, 'license', 'proprietary') && DONE;
		_.ensure(collection, 'extent', {
			spatial: {
				bbox: []
			},
			temporal: {
				interval: []
			}
		}) && DONE;

		_.runAll(Collection, collection, collection);

		// Migrate Commons extension - part 3
		if (_.isObject(collection.properties)) {
			_.removeFromArray(collection, 'stac_extensions', 'commons') && DONE;
			delete collection.properties;
		}

		V.before('0.8.0') && _.populateExtensions(collection, 'collection') && DONE;
		V.before('1.0.0-beta.1') && _.mapValues(collection, 'stac_extensions', ['assets'], ['item-assets']) && DONE;
	},

	extent(collection) {
		if (V.before('0.8.0')) {
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

		if (V.before('1.0.0-rc.3')) {
			// The first extent in a Collection is always the overall extent, followed by more specific extents.
			if (Array.isArray(collection.extent.temporal.interval) && collection.extent.temporal.interval.length > 1) {
				let min, max;
				for(let interval of collection.extent.temporal.interval) {
					if (interval[0] === null) {
						min = null;
					}
					else if (typeof interval[0] === 'string' && min !== null) {
						try {
							let start = new Date(interval[0]);
							if (typeof min === 'undefined' || start < min) {
								min = start;
							}
						} catch (error) {}
					}

					if (interval[1] === null) {
						max = null;
					}
					else if (typeof interval[1] === 'string' && max !== null) {
						try {
							let end = new Date(interval[1]);
							if (typeof max === 'undefined' || end > max) {
								max = end;
							}
						} catch (error) {}
					} 
				}
				collection.extent.temporal.interval.unshift([
					min ? _.toISOString(min) : null,
					max ? _.toISOString(max) : null
				]);
			}
			if (Array.isArray(collection.extent.spatial.bbox) && collection.extent.spatial.bbox.length > 1) {
				let count = collection.extent.spatial.bbox.reduce((val, bbox) => Array.isArray(bbox) ? Math.max(bbox.length, val) : val, 4);
				if (count >= 4) {
					let union = new Array(count).fill(null);
					let middle = count / 2;
					for(let bbox of collection.extent.spatial.bbox) {
						if (!Array.isArray(bbox) || bbox.length < 4) {
							break;
						}
						for(let i in bbox) {
							let c = bbox[i];
							if (union[i] === null) {
								union[i] = c;
							}
							else if (i < middle) {
								union[i] = Math.min(c, union[i]);
							}
							else {
								union[i] = Math.max(c, union[i]);
							}

						}
					}
					if (union.findIndex(c => c === null) === -1) {
						collection.extent.spatial.bbox.unshift(union);
					}
				}
			}
		}
	},

	collectionAssets(collection) {
		V.before('1.0.0-rc.1') && _.removeExtension(collection, 'collection-assets') && DONE;

		Asset.migrateAll(collection);
	},

	itemAsset(collection) {
		V.before('1.0.0-beta.2') && _.rename(collection, 'item_assets', 'assets');

		Asset.migrateAll(collection, 'item_assets');
	},

	summaries(collection) {
		_.ensure(collection, 'summaries', {});

		// other_properties: An early version of the Collection summaries with a similar structure
		// Was mostly used in standalone collctions from openEO and GEE. Move other_properties to summaries.
		if (V.before('0.8.0') && _.isObject(collection.other_properties)) {
			for(let key in collection.other_properties) {
				let prop = collection.other_properties[key];
				if (Array.isArray(prop.extent) && prop.extent.length === 2) {
					collection.summaries[key] = {
						minimum: prop.extent[0],
						maximum: prop.extent[1],
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

		// Migrate Commons extension - part 2
		// Move properties to (single element) summaries if the Collection is standalone
		// see also https://github.com/stac-utils/stac-migrate/issues/3
		if (V.before('1.0.0-beta.1') && _.isObject(collection.properties) && !collection.links.find(link => ['child', 'item'].includes(link.rel))) {
			for(let key in collection.properties) {
				let value = collection.properties[key];
				if (!Array.isArray(value)) {
					value = [value];
				}
				collection.summaries[key] = value;
			}
		}

		if (V.before('1.0.0-rc.1')) {
			_.mapObject(collection.summaries, val => {
				_.rename(val, 'min', 'minimum') && DONE;
				_.rename(val, 'max', 'maximum') && DONE;
				return val;
			});
		}

		// now we can work on all summaries and migrate them
		Fields.migrate(collection.summaries);

		// Some fields should usually be on root-level if there's only one element
		_.moveTo(collection.summaries, 'sci:doi', collection, true) && _.addExtension(collection, SCHEMAS.scientific) && DONE;
		_.moveTo(collection.summaries, 'sci:publications', collection, true, true) && _.addExtension(collection, SCHEMAS.scientific) && DONE;
		_.moveTo(collection.summaries, 'sci:citation', collection, true) && _.addExtension(collection, SCHEMAS.scientific) && DONE;
		_.moveTo(collection.summaries, 'cube:dimensions', collection, true) && _.addExtension(collection, SCHEMAS.datacube) && DONE;

		// Remove summary field if empty
		if (Object.keys(collection.summaries).length === 0) {
			delete collection.summaries;
		}
	}

};

var Item = {

	migrate(item, collection = null, updateVersionNumber = true) {
		V.set(item.stac_version);
		if (updateVersionNumber) {
			item.stac_version = LATEST_VERSION;
		}
		V.before('1.0.0-rc.1') && _.migrateExtensionShortnames(item) && DONE;

		_.ensure(item, 'id', '') && DONE;
		_.ensure(item, 'type', 'Feature') && DONE;
		if (!_.isObject(item.geometry)) {
			item.geometry = null;
		}
		if (item.geometry !== null) {
			_.ensure(item, 'bbox', []) && DONE;
		}
		_.ensure(item, 'properties', {}) && DONE;
		_.ensure(item, 'links', []) && DONE;
		_.ensure(item, 'assets', {}) && DONE;

		// Migrate Commons extension - part 1
		let commons = false;
		if (_.isObject(collection) && _.isObject(collection.properties)) {
			_.removeFromArray(item, 'stac_extensions', 'commons');
			item.properties = Object.assign({}, collection.properties, item.properties);
			commons = true;
		}

		_.runAll(Item, item, item);

		Fields.migrate(item.properties, item);

		Asset.migrateAll(item);

		_.ensure(item, 'stac_extensions', []) && DONE;
		// Also populate extensions if commons has been implemented
		(V.before('0.8.0') || commons) && _.populateExtensions(item, 'item') && DONE;
	}

};

var Asset = {

	migrateAll(context, field = 'assets') {
		for(let key in context[field]) {
			Asset.migrate(context[field][key], context);
		}
	},

	migrate(asset, context) {
		_.runAll(Asset, asset, context);
		Fields.migrate(asset, context);
	},

	mediaTypes(asset) {
		_.is(asset.type, 'string') && _.mapValues(
			asset, 'type',
			['image/vnd.stac.geotiff', 			'image/vnd.stac.geotiff; cloud-optimized=true'],
			['image/tiff; application=geotiff',	'image/tiff; application=geotiff; profile=cloud-optimized']
		);
	},

	eo(asset, context) {
		let bands = _.isObject(context.properties) && Array.isArray(context.properties['eo:bands']) ? context.properties['eo:bands'] : [];
		if (Array.isArray(asset['eo:bands'])) {
			for(let i in asset['eo:bands']) {
				let band = asset['eo:bands'][i];
				if (_.is(band, 'number') && _.isObject(bands[band])) {
					band = bands[band];
				}
				else if (!_.isObject(band)) {
					band = {}; // "Fix" invalid band index
				}
				asset['eo:bands'][i] = band;
			}
		}
	}

};

var Fields = {

	// If no context is given, we are working in summaries
	migrate(obj, context) {
		_.runAll(Fields, obj, context);
	},

	_commonMetadata(obj) {
		// Timestamps must be always in UTC
		// datetime, start_datetime and end_datetime already required UTC before
		if (V.before('1.0.0-rc.3')) {
			_.toUTC(obj, 'created') && DONE;
			_.toUTC(obj, 'updated') && DONE;
		}
	},

	_timestamps(obj) {
		// Timestamps must be always in UTC
		_.toUTC(obj, 'published') && DONE;
		_.toUTC(obj, 'expires') && DONE;
		_.toUTC(obj, 'unpublished') && DONE;
	},

	_versioningIndicator(obj) {
		// Nothing to do
	},

	checksum(obj, context) {
		if (V.before('0.9.0')) {
			_.rename(obj, 'checksum:md5', 'checksum:multihash') && Checksum.toMultihash(obj, 'checksum:multihash', 'md5') && DONE;
			_.rename(obj, 'checksum:sha1', 'checksum:multihash') && Checksum.toMultihash(obj, 'checksum:multihash', 'sha1') && DONE;
			// We assume sha2/3-256 although that may fail in some cases and other lengths are chosen
			// Never seen this implemtned in the wild, so let's try this until another use case comes up
			_.rename(obj, 'checksum:sha2', 'checksum:multihash') && Checksum.toMultihash(obj, 'checksum:multihash', 'sha2-256') && DONE;
			_.rename(obj, 'checksum:sha3', 'checksum:multihash') && Checksum.toMultihash(obj, 'checksum:multihash', 'sha3-256') && DONE;
		}

		V.before('1.0.0-rc.1') && _.rename(obj, 'checksum:multihash', 'file:checksum') && _.addExtension(context, SCHEMAS.file) && DONE;
	},

	cube() {
		// Nothing to do
	},

	dtr(obj, context) {
		if (V.before('0.9.0')) {
			_.rename(obj, 'dtr:start_datetime', 'start_datetime') && DONE;
			_.rename(obj, 'dtr:end_datetime', 'end_datetime') && DONE;
			_.removeExtension(context, 'datetime-range') && DONE;
		}
	},

	eo(obj, context) {
		if (V.before('0.9.0')) {
			_.rename(obj, 'eo:epsg', 'proj:epsg') && _.addExtension(context, SCHEMAS.projection) && DONE;
			_.rename(obj, 'eo:platform', 'platform') && DONE;
			_.rename(obj, 'eo:instrument', 'instruments') && _.toArray(obj, 'instruments') && DONE;
			_.rename(obj, 'eo:constellation', 'constellation') && DONE;
			_.rename(obj, 'eo:off_nadir', 'view:off_nadir') && _.addExtension(context, SCHEMAS.view) && DONE;
			_.rename(obj, 'eo:azimuth', 'view:azimuth') && _.addExtension(context, SCHEMAS.view) && DONE;
			_.rename(obj, 'eo:incidence_angle', 'view:incidence_angle') && _.addExtension(context, SCHEMAS.view) && DONE;
			_.rename(obj, 'eo:sun_azimuth', 'view:sun_azimuth') && _.addExtension(context, SCHEMAS.view) && DONE;
			_.rename(obj, 'eo:sun_elevation', 'view:sun_elevation') && _.addExtension(context, SCHEMAS.view) && DONE;
		}

		V.before('1.0.0-beta.1') && _.rename(obj, 'eo:gsd', 'gsd') && DONE;
	},

	label(obj) {
		// Migrate 0.8.0-rc1 non-pluralized forms
		if (V.before('0.8.0')) {
			_.rename(obj, 'label:property', 'label:properties') && DONE;
			_.rename(obj, 'label:task', 'label:tasks') && DONE;
			_.rename(obj, 'label:overview', 'label:overviews') && _.toArray(obj, 'label:overviews') && DONE;
			_.rename(obj, 'label:method', 'label:methods') && DONE;
			_.toArray(obj, 'label:classes') && DONE;
		}
	},

	pc(obj) {
		V.before('0.8.0') && _.rename(obj, 'pc:schema', 'pc:schemas') && DONE;
	},

	proj(obj) {
		// Nothing to do
	},

	sar(obj, context) {
		// If no context is given, it's in summaries
		let summary = !context;

		// Which version have they been (re)moved?
		_.rename(obj, 'sar:incidence_angle', 'view:incidence_angle') && _.addExtension(context, SCHEMAS.view) && DONE;
		_.rename(obj, 'sar:pass_direction', 'sat:orbit_state') && _.mapValues(obj, 'sat:orbit_state', [null], ['geostationary']) && _.addExtension(context, SCHEMAS.sat) && DONE;

		if (V.before('0.7.0')) {
			_.flattenArray(obj, 'sar:resolution', ['sar:resolution_range', 'sar:resolution_azimuth'], summary) && DONE;
			_.flattenArray(obj, 'sar:pixel_spacing', ['sar:pixel_spacing_range', 'sar:pixel_spacing_azimuth'], summary) && DONE;
			_.flattenArray(obj, 'sar:looks', ['sar:looks_range', 'sar:looks_azimuth', 'sar:looks_equivalent_number'], summary) && DONE;
			_.rename(obj, 'sar:off_nadir', 'view:off_nadir') && _.addExtension(context, SCHEMAS.view) && DONE;
		}

		if (V.before('0.9.0')) {
			_.rename(obj, 'sar:platform', 'platform') && DONE;
			_.rename(obj, 'sar:instrument', 'instruments') && _.toArray(obj, 'instruments') && DONE;
			_.rename(obj, 'sar:constellation', 'constellation') && DONE;
			_.rename(obj, 'sar:type', 'sar:product_type') && DONE;
			_.rename(obj, 'sar:polarization', 'sar:polarizations') && DONE;
			_.flattenOneElementArray(obj, 'sar:absolute_orbit', summary) && _.rename(obj, 'sar:absolute_orbit', 'sat:absolute_orbit') && _.addExtension(context, SCHEMAS.sat) && DONE;
			_.flattenOneElementArray(obj, 'sar:relative_orbit', summary) && _.rename(obj, 'sar:relative_orbit', 'sat:relative_orbit') && _.addExtension(context, SCHEMAS.sat) && DONE;
		}
	},

	sat(obj) {
		// Migrate 0.9.0-rc _angle suffixes
		if (V.before('0.9.0')) {
			_.rename(obj, 'sat:off_nadir_angle', 'sat:off_nadir') && DONE;
			_.rename(obj, 'sat:azimuth_angle', 'sat:azimuth') && DONE;
			_.rename(obj, 'sat:sun_azimuth_angle', 'sat:sun_azimuth') && DONE;
			_.rename(obj, 'sat:sun_elevation_angle', 'sat:sun_elevation') && DONE;
		}
	},

	sci(obj) {
		// Nothing to do
	},

	item(obj) { // Single Item
		if (V.before('0.8.0')) {
			_.rename(obj, 'item:license', 'license') && DONE;
			_.rename(obj, 'item:providers', 'providers') && DONE;
			// No need to remove the extension from stac_extensions as it was not available before 0.8.0
		}
	},

	view(obj) {
		// Nothing to do
	}

};

var Migrate = {

	item(item, collection = null, updateVersionNumber = true) {
		Item.migrate(item, collection, updateVersionNumber);
		return item;
	},
	
	catalog(catalog, updateVersionNumber = true) {
		Catalog.migrate(catalog, updateVersionNumber);
		return catalog;
	},
	
	collection(collection, updateVersionNumber = true) {
		Collection.migrate(collection, updateVersionNumber);
		return collection;
	},
	
	stac(object, updateVersionNumber = true) {
		if (object.type === 'Feature') {
			return Migrate.item(object, null, updateVersionNumber);
		}
		else if (object.type === 'Collection' || _.isDefined(object.extent) || _.isDefined(object.license)) {
			return Migrate.collection(object,  updateVersionNumber);
		}
		else {
			return Migrate.catalog(object, updateVersionNumber);
		}
	}

};

module.exports = Migrate;