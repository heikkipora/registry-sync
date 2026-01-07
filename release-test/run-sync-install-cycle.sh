#!/bin/bash

set -e

printf '\n-- SETUP-UP RUNTIME DIRECTORIES ---------------------------------\n'
rm -fr .test-execution /tmp/.registry-sync-install && mkdir .test-execution /tmp/.registry-sync-install
cp package.json .test-execution
cp .npmrc-for-test-execution .test-execution/.npmrc

printf '\n-- BUILD REGISTRY-SYNC NPM --------------------------------------\n'
(cd .. && npm run build)
pushd ../build > /dev/null
TARBALL=$(npm pack)
mv ${TARBALL} /tmp/.registry-sync-install
popd > /dev/null

printf '\n-- INSTALL REGISTRY-SYNC FROM NPM -------------------------------\n\n'
(cd /tmp/.registry-sync-install && npm i ${TARBALL})

printf "\n-- SYNCHRONIZE PACKAGES IN PACKAGE-LOCK.JSON TO LOCAL FOLDER ----\n\n"
(/tmp/.registry-sync-install/node_modules/.bin/registry-sync --manifest package-lock.json --root .test-execution/local-registry --localUrl https://localhost:8443 --binaryAbi 83,93,108 --binaryArch x64,arm64 --binaryPlatform linux,darwin --includeDev)

printf "\n-- START LOCAL REGISTRY SERVER ----------------------------------\n\n"
(cd server && ./start-server.sh ../.test-execution/local-registry)

printf "\n-- INSTALL FROM LOCAL REGISTRY ----------------------------------\n\n"
(cd .test-execution && NODE_EXTRA_CA_CERTS=$(pwd)/../server/ssl/localhost-ca.pem npm install --cache ./.npm-cache --registry https://localhost:8443)

printf '\n-- CLEAN-UP RUNTIME DIRECTORY -----------------------------------\n'
rm -fr .test-execution/local-registry .test-execution/node_modules .test-execution/package-lock.json

printf "\n-- SYNCHRONIZE PACKAGES IN PACKAGE-LOCK.JSON WITH DEFAULTS ------\n\n"
(/tmp/.registry-sync-install/node_modules/.bin/registry-sync  --manifest package-lock.json --root .test-execution/local-registry --localUrl https://localhost:8443)

printf "\n-- INSTALL FROM LOCAL REGISTRY ----------------------------------\n\n"
(cd .test-execution && NODE_EXTRA_CA_CERTS=$(pwd)/../server/ssl/localhost-ca.pem npm install --cache ./.npm-cache --registry https://localhost:8443)

printf "\n-- STOP LOCAL REGISTRY SERVER -----------------------------------\n\n"
(cd server && ./stop-server.sh)
