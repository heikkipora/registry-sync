import _ from 'lodash'
import program from 'commander'
import {synchronize} from './sync'

program
  .version(require(`${__dirname}/../package.json`).version)
  .option('--root <path>', 'Path to save NPM package tarballs and metadata to')
  .option('--manifest <file>', 'Path to a package-lock.json file to use as catalog for mirrored NPM packages.')
  .option('--localUrl <url>', 'URL to use as root in stored package metadata (i.e. where folder defined as --root will be exposed at)')
  .option('--binaryAbi <list>', 'Comma-separated list of node C++ ABI numbers to download pre-built binaries for. See NODE_MODULE_VERSION column in https://nodejs.org/en/download/releases/')
  .option('--binaryArch <list>', 'Comma-separated list of CPU architectures to download pre-built binaries for. Valid values: arm, ia32, and x64')
  .option('--binaryPlatform <list>', 'Comma-separated list of OS platforms to download pre-built binaries for. Valid values: linux, darwin, win32, sunos, freebsd, openbsd, and aix')
  .option('--concurrency [value]', 'Optional value to to control concurrency when downloading packages from registry. Default value is 5.')
  .option('--registryUrl [url]', 'Optional URL to use as NPM registry when fetching packages. Default value is https://registry.npmjs.org')
  .option('--pretty', 'Optionally pretty print JSON metadata files')
  .parse(process.argv)

if (!program.root || !program.localUrl || !program.manifest || !program.binaryAbi || !program.binaryArch || !program.binaryPlatform) {
  console.error(program.help())
  process.exit(1)
}

const abis = program.binaryAbi.split(',')
const architectures = program.binaryArch.split(',')
const platforms = program.binaryPlatform.split(',')
const prebuiltBinaryProperties = _.flattenDeep(
  abis.map(abi =>
    architectures.map(arch =>
      platforms.map(platform => ({abi, arch, platform}))
    )
  )
)

const options = {
  localUrl: program.localUrl,
  manifest: program.manifest,
  prebuiltBinaryProperties,
  pretty: program.pretty,
  registryUrl: program.registryUrl || 'https://registry.npmjs.org',
  rootFolder: program.root
}

synchronize(options)
  .then(newPackages => console.log('Downloaded', newPackages))
