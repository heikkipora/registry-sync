#!/bin/bash

set -e

printf '\n-- SETUP-UP RUNTIME DIRECTORY -----------------------------------\n'
rm -fr .test-execution && mkdir .test-execution
cp package.json .test-execution
cp .npmrc-for-test-execution .test-execution/.npmrc

printf '\n-- BUILD REGISTRY-SYNC ------------------------------------------\n'
(cd .. && npm run build)

printf '\n-- INSTALL REGISTRY-SYNC ----------------------------------------\n\n'
(cd ../build && npm i --production)

printf "\n-- SYNCHRONIZE PACKAGES IN PACKAGE-LOCK.JSON TO LOCAL FOLDER ----\n\n"
(cd ../build && bin/sync --manifest ../release-test/package-lock.json --root ../release-test/.test-execution/local-registry --localUrl https://localhost:8443 --binaryAbi 72,83 --binaryArch x64 --binaryPlatform linux,darwin --includeDev)

printf "\n-- START LOCAL REGISTRY SERVER ----------------------------------\n\n"
(cd server && ./start-server.sh ../.test-execution/local-registry)

printf "\n-- INSTALL FROM LOCAL REGISTRY ----------------------------------\n\n"
(cd .test-execution && npm install --cache ./.npm-cache --registry https://localhost:8443)

printf "\n-- STOP LOCAL REGISTRY SERVER -----------------------------------\n\n"
(cd server && ./stop-server.sh)
