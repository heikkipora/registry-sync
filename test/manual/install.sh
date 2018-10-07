#!/bin/bash

rm -fr ./node_modules ./.npm-cache ./package-lock.json
npm install --cache ./.npm-cache
rm -fr .npm-cache