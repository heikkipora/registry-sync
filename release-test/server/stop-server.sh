#!/bin/bash

set -e

kill `cat server.pid`
rm -f server.pid