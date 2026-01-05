# registry-sync

Synchronizes selected NPM packages from a remote NPM registry (such as https://registry.npmjs.org) to a local folder.
The local copy can then be used as a simple private NPM registry without publishing capabilities. Pre-built native binaries bundled with node-pre-gyp are also included.

[![npm version](https://badge.fury.io/js/registry-sync.svg)](https://badge.fury.io/js/registry-sync)
![Run tests](https://github.com/heikkipora/registry-sync/workflows/Run%20tests/badge.svg)

## Pre-requisites

- Node.js v22.18.0 or newer

## Installation

    npm install -g registry-sync

## Usage

### Synchronizing packages from the npmjs.org registry

    registry-sync [options]

    -h, --help               output usage information
    -V, --version            output the version number
    --root <path>            Path to save NPM package tarballs and metadata to
    --manifest <file>        Path to a package-lock.json or yarn.lock file to use as catalog for mirrored NPM packages
    --localUrl <url>         URL to use as root in stored package metadata (i.e. where folder defined as --root will be exposed at)
    --binaryAbi <list>       Optional comma-separated list of node C++ ABI numbers (NODE_MODULE_VERSION) to download pre-built binaries for.
                             Look for NODE_MODULE_VERSION in release ChangeLogs via https://nodejs.org/en/download/releases/.
                             Default value is from the current Node.js process.
    --binaryArch <list>      Optional comma-separated list of CPU architectures to download pre-built binaries for.
                             Valid values: arm, arm64, ia32, and x64.
                             Default value is from the current Node.js process.
    --binaryPlatform <list>  Optional comma-separated list of OS platforms to download pre-built binaries for.
                             Valid values: linux, darwin, win32, sunos, freebsd, openbsd, and aix.
                             Default value is from the current Node.js process.
    --registryUrl [url]      Optional URL to use as NPM registry when fetching packages.
                             Default value is https://registry.npmjs.org
    --registryToken [string] Optional Bearer token for the registry.
                             Not included by default.
    --dontEnforceHttps       Disable the default behavior of downloading tarballs over HTTPS (will use whichever protocol is defined in the registry metadata)
    --includeDev             Include also packages found from devDependencies section of the --manifest.
                             Not included by default.
    --dryRun                 Print packages that would be downloaded but do not download them

Example:

    registry-sync --root ./local-registry \
      --manifest ./package-lock.json \
      --localUrl http://localhost:8000 \
      --binaryAbi 93,108 \
      --binaryArch x64,arm64 \
      --binaryPlatform darwin,linux

Re-executing `registry-sync` will only download and update files for new package versions.

### Serving the local root folder after synchronization

Configure a web server to use `index.json` as index file name instead of `index.html`.
Also configure `HTTP 404` responses to have an `application/json` body of `{}`.

For example, for local testing you can run nginx in a container to serve the downloaded packages:

```
# Create a very simple nginx config
cat <<EOF >nginx.conf
server {
  listen 8000;
  server_name localhost;

  location / {
    root /usr/share/nginx/html;
    index index.json;
  }

  error_page 404 @404_empty_json;

  location @404_empty_json {
    default_type application/json;
    return 404 '{}';
  }
}
EOF

# Run nginx and serve directory local-registry
docker run --rm --name registry -p 8000:8000 \
  --volume="${PWD}/local-registry:/usr/share/nginx/html:ro" \
  --volume="${PWD}/nginx.conf:/etc/nginx/conf.d/default.conf:ro" nginx:1.19
```

Then you can install dependencies from the local registry using `npm`

```
npm_config_registry='http://localhost:8000' npm install
```

or using `yarn`

```
YARN_REGISTRY='http://localhost:8000' yarn install
```

### Creating a separate lockfile for synchronization

In some cases `npm` might not include all optional packages that are needed for all platforms to `package-lock.json`, depending on which OS you used to create the lockfile.

In this case it might be useful to copy the `package.json` that you want to synchronize as a local repository to somewhere else and create a new cross platform `package-lock.json` by running:

```
npm install --force --package-lock-only
```

After this you can pass the new lockfile to `registry-sync`.

## Changelog

See [releases](https://github.com/heikkipora/registry-sync/releases).

## Contributing

Pull requests are welcome. Kindly check that your code passes ESLint checks by running `npm run eslint` first.
Integration tests can be run with `npm test`. Both are anyway run automatically by GitHub Actions.
