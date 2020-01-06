# registry-sync

Synchronizes selected NPM packages from a remote NPM registry (such as https://registry.npmjs.org) to a local folder.
The local copy can then be used as a simple private NPM registry without publishing capabilities. Pre-built native binaries bundled with node-pre-gyp are also included.

[![npm version](https://badge.fury.io/js/registry-sync.svg)](https://badge.fury.io/js/registry-sync)
[![build status](https://travis-ci.org/heikkipora/registry-sync.svg?branch=master)](https://travis-ci.org/heikkipora/registry-sync)

## Pre-requisites

- Node.js v8.0.0 or newer

## Installation

    npm install -g registry-sync

## Usage

### Synchronizing packages from the npmjs.org registry

    registry-sync [options]

    -h, --help               output usage information
    -V, --version            output the version number
    --root <path>            Path to save NPM package tarballs and metadata to
    --manifest <file>        Path to a package-lock.json file to use as catalog for mirrored NPM packages
    --localUrl <url>         URL to use as root in stored package metadata (i.e. where folder defined as --root will be exposed at)
    --binaryAbi <list>       Comma-separated list of node C++ ABI numbers to download pre-built binaries for. See NODE_MODULE_VERSION column in https://nodejs.org/en/download/releases/
    --binaryArch <list>      Comma-separated list of CPU architectures to download pre-built binaries for. Valid values: arm, ia32, and x64
    --binaryPlatform <list>  Comma-separated list of OS platforms to download pre-built binaries for. Valid values: linux, darwin, win32, sunos, freebsd, openbsd, and aix
    --registryUrl [url]      Optional URL to use as NPM registry when fetching packages. Default value is https://registry.npmjs.org
    --dontEnforceHttps       Disable the default behavior of downloading tarballs over HTTPS (will use whichever protocol is defined in the registry metadata)
    --includeDev             Include also packages found from devDependencies section of the --manifest. Not included by default.

Example:

    registry-sync --root ./local-registry --manifest ./package-lock.json --localUrl http://localhost:8000 --binaryAbi 48,57 --binaryArch x64 --binaryPlatform darwin,linux

Re-executing ```registry-sync``` will only download and update files for new package versions.

### Serving the local root folder after synchronization

Configure a web server to use `index.json` as index file name instead of `index.html`.
Also configure ```HTTP 404``` responses to have an ```application/json``` body of ```{}```.

## Changelog

See [releases](https://github.com/heikkipora/registry-sync/releases).

## Contributing

Pull requests are welcome. Kindly check that your code passes ESLint checks by running ```npm run eslint``` first.
Integration tests can be run with ```npm test```. Both are anyway run automatically by Travis CI.
