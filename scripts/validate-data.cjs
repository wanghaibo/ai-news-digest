#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { validateData } = require('../app.js');
const root = path.resolve(__dirname, '..');
try {
  const data = validateData(JSON.parse(fs.readFileSync(path.join(root, 'data/digests.json'), 'utf8')));
  for (const digest of data.digests) {
    const markdown = path.join(root, 'digests', digest.date + '.md');
    if (!fs.existsSync(markdown)) throw new Error('Missing Markdown archive: digests/' + digest.date + '.md');
    if (!fs.readFileSync(markdown, 'utf8').trim()) throw new Error('Markdown archive is empty: ' + digest.date);
  }
  console.log('Validated ' + data.digests.length + ' digest(s), with matching Markdown archives.');
} catch (error) {
  console.error('Validation failed: ' + error.message);
  process.exitCode = 1;
}
