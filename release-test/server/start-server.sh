#!/bin/bash

set -e

SERVE_FOLDER=$1

npm ci
node src/index.ts --root $SERVE_FOLDER --sslCert ssl/localhost.crt --sslKey ssl/localhost.key &
echo $! > server.pid
sleep 2
