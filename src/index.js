import _ from 'lodash'
import program from 'commander'
import {synchronize} from './sync'
import {URL} from 'url'

program
  .storeOptionsAsProperties()
  .version(require(`${__dirname}/../package.json`).version)
  .requiredOption('--root <path>', 'Path to save NPM package tarballs and metadata to')
  .requiredOption('--manifest <file>', 'Path to a package-lock.json file to use as catalog for mirrored NPM packages.')
  .requiredOption('--localUrl <url>', 'URL to use as root in stored package metadata (i.e. where folder defined as --root will be exposed at)')
  .requiredOption('--binaryAbi <list>', 'Comma-separated list of node C++ ABI numbers to download pre-built binaries for. See NODE_MODULE_VERSION column in https://nodejs.org/en/download/releases/')
  .requiredOption('--binaryArch <list>', 'Comma-separated list of CPU architectures to download pre-built binaries for. Valid values: arm, ia32, and x64')
  .requiredOption('--binaryPlatform <list>', 'Comma-separated list of OS platforms to download pre-built binaries for. Valid values: linux, darwin, win32, sunos, freebsd, openbsd, and aix')
  .option('--registryUrl [url]', 'Optional URL to use as NPM registry when fetching packages. Default value is https://registry.npmjs.org')
  .option('--dontEnforceHttps', 'Disable the default behavior of downloading tarballs over HTTPS (will use whichever protocol is defined in the registry metadata)')
  .option('--includeDev', 'Include also packages found from devDependencies section of the --manifest')
  .parse(process.argv)

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
  localUrl: new URL(program.localUrl),
  manifest: program.manifest,
  prebuiltBinaryProperties,
  registryUrl: program.registryUrl || 'https://registry.npmjs.org',
  rootFolder: program.root,
  enforceTarballsOverHttps: Boolean(!program.dontEnforceHttps),
  includeDevDependencies: Boolean(program.includeDev)
}

synchronize(options)
  .then(newPackages => console.log(`Downloaded ${newPackages.length} packages`))
