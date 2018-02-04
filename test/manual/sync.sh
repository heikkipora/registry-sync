#!/bin/bash

../../node_modules/.bin/babel-node ../../bin/sync --manifest ./package-lock.json --root ./.download --localUrl https://localhost:8443 --binaryAbi 48,57 --binaryArch x64 --binaryPlatform darwin
