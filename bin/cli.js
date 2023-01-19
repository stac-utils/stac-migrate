#!/usr/bin/env node
const fs = require('fs');
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const Migrate = require('../migrate');
const package = require("../package.json");

const args = yargs(hideBin(process.argv))
  .option('_', {
    type: 'string',
    describe: 'File to load the STAC data from'
  })
  .option('dest', {
    type: 'string',
    description: 'File to save the result to',
    alias: 'd'
  })
  .option('collection', {
    type: 'boolean',
    description: 'Enforce the collection migration',
    conflicts: ['catalog', 'item'],

  })
  .option('catalog', {
    type: 'boolean',
    description: 'Enforce the catalog migration',
    conflicts: ['collection', 'item',]
  })
  .option('item', {
    type: 'boolean',
    description: 'Enforce the item migration',
    conflicts: ['catalog', 'collection']
  })
  .option('collection_path', {
    type: 'string',
    description: 'Pass the path to a collection to the item, only possible if --item has been specified.',
    conflicts: ['catalog', 'collection']
  })
  .option('indent', {
    type: 'number',
    description: 'Number of spaces to use for JSON indentation',
    default: 2
  })
  .help()
  .parse()

run(args);

function run(args) {
  console.log("STAC Migrate v" + package.version);
  let fn = ['collection', 'catalog', 'item'].find(type => Boolean(args[type])) || 'stac';
  if (args._.length !== 1) {
    throw new Error("Please provide exatctly one source file.");
  }
  let src = args._[0];
  let dest = args.dest || src;

  let dataStr = fs.readFileSync(src);
  let dataObj = JSON.parse(dataStr);
  let options = [dataObj];
  if (fn === 'item') {
    let collestionStr = fs.readFileSync(args.collection_path);
    let collestionObj = JSON.parse(collestionStr);
    options.push(collestionObj);
  }
  Migrate[fn](...options)
  dataStr = JSON.stringify(dataObj, null, args.indent);
  fs.writeFileSync(dest, dataStr);
  console.log("Migrated successfully: " + dest);
}