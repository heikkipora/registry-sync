# registry-sync

Synchronizes selected packages and their transitive dependencies from a remote NPM registry (such as https://registry.npmjs.org) to a local folder.
The local copy can then be used as a simple private NPM registry without publishing capabilities. Pre-built native binaries (bundled with node-pre-gyp) are also included.

Inspired by https://www.npmjs.com/package/npm-mirror, which unfortunately seems to be in hibernation and not compatible with the current registry.npmjs.org

[![npm version](https://badge.fury.io/js/registry-sync.svg)](https://badge.fury.io/js/registry-sync)

## Pre-requisites

- Node.js v4.4.0 or newer

## Installation

    npm install -g registry-sync

## Usage

### Synchronizing packages from the npmjs.org registry:

    registry-sync [options]

    -h, --help               output usage information
    -V, --version            output the version number
    --root <path>            Path to save NPM package tarballs and metadata to
    --manifest <file>        Path to a package.json file to use as catalog for mirrored NPM packages. Their transitive (production) dependencies are mirrored as well.
    --localUrl <url>         URL to use as root in stored package metadata (i.e. where folder defined as --root will be exposed at)
    --binaryAbi <list>       Comma-separated list of node C++ ABI numbers to download pre-built binaries for. See NODE_MODULE_VERSION column in https://nodejs.org/en/download/releases/
    --binaryArch <list>      Comma-separated list of CPU architectures to download pre-built binaries for. Valid values: arm, ia32, and x64
    --binaryPlatform <list>  Comma-separated list of OS platforms to download pre-built binaries for. Valid values: linux, darwin, win32, sunos, freebsd, openbsd, and aix
    --registryUrl [url]      URL to use as NPM registry when fetching packages (defaults to https://registry.npmjs.org)
    --prune                  Optionally remove orphaned files from the root folder
    --pretty                 Optionally pretty print JSON metadata files

Example:

    registry-sync --root /tmp/my-registry --manifest ./package.json --localUrl http://localhost:8000 --binaryAbi 46,47,48 --binaryArch x64 --binaryPlatform linux,darwin

..where the referred ```package.json``` file needs to contain at least a "dependencies" section. An extension to the standard ```package.json``` syntax allows defining multiple versions of a top-level dependency (see [test/package.json](https://github.com/heikkipora/registry-sync/blob/master/test/package.json) for an example). Re-executing ```registry-sync``` will only download and update files for new package versions.

### Serving the local registry after synchronization:

    registry-serve [options]

    -h, --help            output usage information
    -V, --version         output the version number
    --root <path>         Path to serve NPM packages from
    --httpPort [number]   Local HTTP port to bind the server to (defaults to 8000)
    --httpsPort [number]  Local HTTPS port to bind the server to (defaults to 8443)
    --sslCert [path]      Optional path to SSL certificate file (defaults to listening only to HTTP)
    --sslKey [path]       Optional path to SSL private key file (defaults to listening only to HTTP)

Example:

    registry-serve --root /tmp/my-registry

## Using a proper web server instead of registry-serve (recommended)

Configure your web server to use `index.json` as index file name instead of `index.html`. Also configure 404 responses to have an application/json body of "{}".
