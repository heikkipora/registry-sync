#!/bin/bash

npm cache clean --force
rm -fr ./node_modules
npm install
