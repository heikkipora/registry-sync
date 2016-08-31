# registry-sync

Synchronizes selected packages and their transitive dependencies from a remote NPM registry (such as https://registry.npmjs.org) to a local folder.
The local copy can then be used as a simple private NPM registry without publishing capabilities.

Inspired by https://www.npmjs.com/package/npm-mirror, which unfortunately seems to be in hibernation and not compatible with the current registry.npmjs.org

## Pre-requisites

- Node.js v4.4.0 or newer

## Installation

    npm install -g npm-mirror

## Usage

### Synchronizing packages from the npmjs.org registry:

    registry-sync [options]

    -h, --help           output usage information
    -V, --version        output the version number
    --root <path>        Path to save NPM package tarballs and metadata to
    --manifest <file>    Path to a package.json file to use as catalog for mirrored NPM packages. Their transitive (production) dependencies are mirrored as well.
    --localUrl <url>     URL to use as root in stored package metadata (i.e. where folder defined as --root will be exposed at)
    --registryUrl [url]  URL to use as NPM registry when fetching packages (defaults to https://registry.npmjs.org)

Example:

    registry-sync --root /tmp/my-registry --manifest ./package.json --localUrl http://localhost:8000

..where the referred ```package.json``` file needs to contain at least a "dependencies" section.
Re-executing ```registry-sync``` will only download and update files for new package versions.

### Serving the local registry after synchronization:

    registry-serve [options]

    -h, --help       output usage information
    -V, --version    output the version number
    --root <path>    Path to serve NPM packages from
    --port [number]  Local HTTP port to bind the server to (defaults to 3000)

Example:

    registry-serve --root /tmp/my-registry --port 8000

## Using a proper web server instead of ```registry-serve``` (recommended)

Configure your web server to use `index.json` as index file name instead of `index.html`.
