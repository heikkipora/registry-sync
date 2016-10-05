#!/bin/bash

rm -fr ./node_modules
NODE_TLS_REJECT_UNAUTHORIZED=0 npm install
