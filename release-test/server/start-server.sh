#!/bin/bash

set -e

SERVE_FOLDER=$1

npm i
node src/index.js --root $SERVE_FOLDER --sslCert ssl/localhost.crt --sslKey ssl/localhost.key &
echo $! > server.pid
sleep 2
