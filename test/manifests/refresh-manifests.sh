#!/bin/bash

set -e

rm -fr node_modules package-lock.json yarn.lock
npm install
npx yarn
node ./update-fixtures.ts
