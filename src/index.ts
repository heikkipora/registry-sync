import * as fs from 'fs'
import * as path from 'path'
import * as program from 'commander'
import type {CommandLineOptions, PlatformVariant} from './types'
import {synchronize} from './sync'
import {URL} from 'url'

const {version} = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8'))

program
  .version(version)
  .requiredOption('--root <path>', 'Path to save NPM package tarballs and metadata to')
  .requiredOption('--manifest <file>', 'Path to a package-lock.json or yarn.lock file to use as catalog for mirrored NPM packages.')
  .requiredOption('--localUrl <url>', 'URL to use as root in stored package metadata (i.e. where folder defined as --root will be exposed at)')
  .requiredOption('--binaryAbi <list>', 'Comma-separated list of node C++ ABI numbers to download pre-built binaries for. See NODE_MODULE_VERSION column in https://nodejs.org/en/download/releases/')
  .requiredOption('--binaryArch <list>', 'Comma-separated list of CPU architectures to download pre-built binaries for. Valid values: arm, ia32, and x64')
  .requiredOption('--binaryPlatform <list>', 'Comma-separated list of OS platforms to download pre-built binaries for. Valid values: linux, darwin, win32, sunos, freebsd, openbsd, and aix')
  .option('--registryUrl [url]', 'Optional URL to use as NPM registry when fetching packages. Default value is https://registry.npmjs.org')
  .option('--dontEnforceHttps', 'Disable the default behavior of downloading tarballs over HTTPS (will use whichever protocol is defined in the registry metadata)')
  .option('--includeDev', 'Include also packages found from devDependencies section of the --manifest')
  .option('--dryRun', 'Print packages that would be downloaded but do not download them')
  .parse(process.argv)

const rawOptions: program.OptionValues = program.opts()

const abis: number[] = rawOptions.binaryAbi.split(',').map(Number)
const architectures: string[] = rawOptions.binaryArch.split(',')
const platforms: string[] = rawOptions.binaryPlatform.split(',')
const prebuiltBinaryProperties: PlatformVariant[] =
  abis.map(abi =>
    architectures.map(arch =>
      platforms.map(platform => ({abi, arch, platform}))
    ).flat()
  ).flat()

const options: CommandLineOptions = {
  localUrl: new URL(rawOptions.localUrl),
  manifest: rawOptions.manifest,
  prebuiltBinaryProperties,
  registryUrl: rawOptions.registryUrl || 'https://registry.npmjs.org',
  rootFolder: rawOptions.root,
  enforceTarballsOverHttps: Boolean(!rawOptions.dontEnforceHttps),
  includeDevDependencies: Boolean(rawOptions.includeDev),
  dryRun: Boolean(rawOptions.dryRun)
}

synchronize(options)
