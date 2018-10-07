#!/bin/bash

(cd ../../ && npm run build)
../../build/bin/sync --manifest ./package-lock.json --root ./.download --localUrl https://localhost:8443 --binaryAbi 57,64 --binaryArch x64 --binaryPlatform darwin
