#!/bin/bash

time ../bin/sync --pretty --manifest ./package.json --root ./download --localUrl https://localhost:8443 --binaryAbi 46,47,48 --binaryArch x64 --binaryPlatform linux,darwin
