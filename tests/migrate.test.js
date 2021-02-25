const Migrate = require('../migrate');
const fs = require('fs');
const path = require('path');

describe('STAC Migrations', () => {
    const files = fs.readdirSync('./tests/legacy/');
    for(let file of files) {
        const legacy = require('./legacy/' + file);
        const latest = require('./latest/' + file);
        test(file, () => {
            // Test that a response following the latest spec doesn't change at all
            expect(Migrate.stac(legacy)).toEqual(latest);
        });
    }
});