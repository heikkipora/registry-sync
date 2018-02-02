import _ from 'lodash'
import {fetchUrl} from './client'
import mkdirp from 'mkdirp'
import path from 'path'
import Promise from 'bluebird'
import readdirp from 'readdirp'
import rimraf from 'rimraf'
import semver from 'semver'
import ssri from 'ssri'
import streamifier from 'streamifier'
import tar from 'tar-fs'
import url from 'url'
import zlib from 'zlib'

const fs = Promise.promisifyAll(require('fs'))

const CONCURRENCY = 5

/* eslint-disable no-warning-comments, no-inline-comments, line-comment-position, max-depth */
export async function synchronize(topLevelManifest, options) {
  const dependencies = dependenciesToArray(_.merge(topLevelManifest.dependencies, topLevelManifest.devDependencies))
  await Promise.map(dependencies, dependency => resolveVersionAndDependenciesRecursive(dependency, options), {concurrency: CONCURRENCY})

  const packages = collectedPackagesAsArray()
  await Promise.map(packages, pkg => downloadPackage(pkg, options), {concurrency: CONCURRENCY})
  await prune(options)
}

async function downloadPackage(nameAndVersions, options) {
  const metadataContent = await fetchMetadata(nameAndVersions.name, options)
  const file = await packageMetadataFilePath(nameAndVersions.name, options)
  const distributions = nameAndVersions.versions.map(version => ({
      name: nameAndVersions.name,
      version,
      dist: metadataContent.versions[version].dist,
      binary: metadataContent.versions[version].binary
    })
  )

  for (const distribution of distributions) {
    if (distribution.binary && distribution.binary.module_name) {
      for (const properties of options.prebuiltBinaryProperties) {
        if (await prebuiltBinaryExists(distribution.name, distribution.version, distribution.binary, properties.abi, properties.platform, properties.arch, options)) {
          console.log('Already downloaded pre-built binary ' + prebuiltBinaryFileName(distribution.name, distribution.version, distribution.binary, properties.abi, properties.platform, properties.arch))
        } else {
          try {
            const data = await fetchPrebuiltBinary(distribution.name, distribution.version, distribution.binary, properties.abi, properties.platform, properties.arch)
            await fs.writeFileAsync(prebuiltBinaryFilePath(distribution.name, distribution.version, distribution.binary, properties.abi, properties.platform, properties.arch, options), data)
            console.log('Downloaded pre-built binary ' + prebuiltBinaryUrl(distribution.name, distribution.version, distribution.binary, properties.abi, properties.platform, properties.arch))
          } catch (err) {
            console.log('Pre-built binary not available ' + prebuiltBinaryUrl(distribution.name, distribution.version, distribution.binary, properties.abi, properties.platform, properties.arch))
          }
        }
      }
    }
  }

  for (const distribution of distributions) {
    const needMetadataRewrite = distribution.binary
    if (await tarballExists(distribution, options)) {
      if (needMetadataRewrite) {
        const data = await fs.readFileAsync(packageTarballFilePath(distribution.name, distribution.version, options))
        metadataContent.versions[distribution.version].dist.shasum = sha1(data)
        metadataContent.versions[distribution.version].dist.integrity = sha512(data)
      }
      console.log('Already downloaded ' + distribution.name + '@' + distribution.version)
    } else {
      const data = await fetchTarball(distribution.dist)
      if (distribution.dist.integrity) {
        if (sha512(data) != distribution.dist.integrity) {
          throw new Error('Integrity check with SHA512 failed for ' + distribution.name + '@' + distribution.version)
        }
      } else if (sha1(data) != distribution.dist.shasum) {
        throw new Error('Integrity check with SHA1 failed for ' + distribution.name + '@' + distribution.version)
      }
      if (needMetadataRewrite) {
        await rewriteMetadataInTarball(distribution, data, options)
        if (needMetadataRewrite) {
          metadataContent.versions[distribution.version].dist.shasum = sha1(data)
          metadataContent.versions[distribution.version].dist.integrity = sha512(data)
        }
        await fs.writeFileAsync(packageTarballFilePath(distribution.name, distribution.version, options), data)
      }
      console.log('Downloaded ' + distribution.name + '@' + distribution.version)
    }
  }

  const content = JSON.stringify(cleanupMetadata(metadataContent, nameAndVersions.versions), null, options.pretty ? 2 : undefined)
  if (!await fileExists(file) || content != await fs.readFileAsync(file)) {
    await fs.writeFileAsync(file, content)
  }

  function cleanupMetadata(metadataContent, versions) {
    const content = _.cloneDeep(metadataContent)
    Object.keys(content.versions).forEach(version => {
      if (versions.indexOf(version) == -1) {
        delete content.versions[version]
        delete content.time[version]
      }
      else {
        content.versions[version].dist.tarball = packageTarballFileUrl(nameAndVersions.name, version, options)
        if (content.versions[version].binary) {
          content.versions[version].binary.host = options.localUrl
          content.versions[version].binary.remote_path = `/${nameAndVersions.name}/`
        }
      }
    })
    content['dist-tags'] = { latest: versions.slice(0).sort(semver.rcompare)[0] }
    return content
  }
}

async function resolveVersionAndDependenciesRecursive(pkg, options) {
  const metadata = await fetchMetadata(pkg.name, options)
  const available = Object.keys(metadata.versions)
  const version = semver.maxSatisfying(available, pkg.versionRange)
  const dependencies = dependenciesToArray(metadata.versions[version].dependencies) // tODO: no need if pkg has been collected already
  const packageAndDependencies = {
    name: pkg.name,
    version,
    dependencies
  }
  const packageNeedsProcessing = collectPackage(packageAndDependencies)
  if (packageNeedsProcessing) {
    for (const dependency of dependencies) {
      await resolveVersionAndDependenciesRecursive(dependency, options)
    }
  }
}

function dependenciesToArray(dependencies) {
  return _(dependencies || {})
    .keys()
    .map(name => {
      const versionRange = dependencies[name]
      if (versionRange instanceof Array) {
        return versionRange.map(version => ({name, versionRange: version}))
      }
      return {name, versionRange}
    })
    .flatten()
    .value()
}

// tODO: get rid of global state
const collectedPackages = {}

function collectPackage(pkg) {
  const versions = collectedPackages[pkg.name] || []
  if (versions.indexOf(pkg.version) != -1) {
    return false
  }
  versions.push(pkg.version)
  collectedPackages[pkg.name] = versions
  return true
}

function collectedPackagesAsArray() {
  return _.toPairs(collectedPackages)
    .map(([name, versions]) => ({name, versions}))
}

// tODO: split and rewrite in a more async friendly manner, remove *Sync() calls
function rewriteMetadataInTarball(distribution, data, options) {
  return new Promise((resolve, reject) => {
    const extractDir = path.resolve(options.rootFolder, `_tmp_${distribution.name}`)
    mkdirp.sync(extractDir)
    const tgzIn = streamifier
      .createReadStream(data)
      .pipe(zlib.createGunzip())
      .pipe(tar.extract(extractDir))

    tgzIn.on('finish', () => {
      const packageJsonPath = path.resolve(extractDir, path.join('package', 'package.json'))
      const packagedMetadata = require(packageJsonPath)
      packagedMetadata.binary.host = options.localUrl
      packagedMetadata.binary.remote_path = `/${distribution.name}/`
      fs.writeFileSync(packageJsonPath, JSON.stringify(packagedMetadata, null, 2))

      const chunks = []
      const tgzOut = tar.pack(extractDir).pipe(zlib.createGzip())
      tgzOut.on('data', chunk => chunks.push(chunk))
      tgzOut.on('end', () => {
        rimraf(extractDir, err => {
          if (err) {
            reject(err)
          }
          resolve(Buffer.concat(chunks))
        })
      })
      tgzOut.on('error', reject)
    })
    tgzIn.on('error', reject)
  })
}

function prebuiltBinaryExists(name, version, binaryMetadata, abi, platform, arch, options) {
  return fileExists(prebuiltBinaryFilePath(name, version, binaryMetadata, abi, platform, arch, options))
}

function prebuiltBinaryFilePath(name, version, binaryMetadata, abi, platform, arch, options) {
  return path.resolve(options.rootFolder, path.join(name, prebuiltBinaryFileName(name, version, binaryMetadata, abi, platform, arch)))
}

function prebuiltBinaryRemotePath(name, version, binaryMetadata, abi, platform, arch) {
  return formatPrebuilt(binaryMetadata.remote_path, name, version, binaryMetadata.module_name, abi, platform, arch).replace(/[\/]+/g, '/')
}

function prebuiltBinaryFileName(name, version, binaryMetadata, abi, platform, arch) {
  return formatPrebuilt(binaryMetadata.package_name, name, version, binaryMetadata.module_name, abi, platform, arch).replace(/[\/]+/g, '/')
}

function prebuiltBinaryUrl(name, version, binaryMetadata, abi, platform, arch) {
  const remotePath = prebuiltBinaryRemotePath(name, version, binaryMetadata, abi, platform, arch)
  const fileName = prebuiltBinaryFileName(name, version, binaryMetadata, abi, platform, arch)
  return url.resolve(binaryMetadata.host, remotePath + fileName)
}

function packageFilename(name, version) {
  const normalized = name.replace(/\//g, '-')
  return `${normalized}-${version}.tgz`
}

async function packageMetadataFilePath(name, options) {
  await mkdirp(path.resolve(options.rootFolder, name))
  return path.resolve(options.rootFolder, path.join(name, 'index.json'))
}

function packageTarballFilePath(name, version, options) {
  return path.resolve(options.rootFolder, path.join(name, packageFilename(name, version)))
}

function packageTarballFileUrl(name, version, options) {
  return url.resolve(options.localUrl, `${name}/${packageFilename(name, version)}`)
}

function tarballExists(distribution, options) {
  return fileExists(packageTarballFilePath(distribution.name, distribution.version, options))
}

function fetchMetadata(name, options) {
  return fetchUrl(url.resolve(options.registryUrl, encodeScopedPackage(name)))
}

function fetchTarball(dist) {
  return fetchUrl(dist.tarball, true)
}

function fetchPrebuiltBinary(name, version, binaryMetadata, abi, platform, arch) {
  return fetchUrl(prebuiltBinaryUrl(name, version, binaryMetadata, abi, platform, arch), true)
}

function encodeScopedPackage(name) {
  return name.replace(/\//g, '%2f')
}

// see node-pre-gyp: /lib/util/versioning.js for documentation of possible values
function formatPrebuilt(formatString, name, version, moduleName, abi, platform, arch) {
  const moduleVersion = semver.parse(version)
  const prerelease = (moduleVersion.prerelease || []).join('.')
  const build = (moduleVersion.build || []).join('.')

  return formatString
    .replace('{name}', name)
    .replace('{version}', version)
    .replace('{major}', moduleVersion.major)
    .replace('{minor}', moduleVersion.minor)
    .replace('{patch}', moduleVersion.patch)
    .replace('{prerelease}', prerelease)
    .replace('{build}', build)
    .replace('{module_name}', moduleName)
    .replace('{node_abi}', `node-v${abi}`)
    .replace('{platform}', platform)
    .replace('{arch}', arch)
    .replace('{configuration}', 'Release')
    .replace('{toolset}', '')
}

function sha1(data) {
  const [integrity] = ssri.fromData(data, {algorithms: ['sha1']}).sha1
  return integrity.hexDigest()
}

function sha512(data) {
  const [integrity] = ssri.fromData(data, {algorithms: ['sha512']}).sha512
  return integrity.toString()
}

export async function readJson(path) {
  const content = await fs.readFileAsync(path, 'utf8')
  return JSON.parse(content)
}

const requiredFiles = {}

function fileExists(file) {
  requiredFiles[file] = true
  return fs.existsAsync(file)
}

function prune(options) {
  return new Promise((resolve, reject) => {
    const stream = readdirp({root: options.rootFolder, entryType: 'both'})
    stream.on('error', reject)
    stream.on('end', resolve)
    stream.on('data', entry => {
      if (requiredFiles[entry.fullPath]) {
        return
      }
      if (entry.stat.isDirectory()) {
        fs.rmdir(entry.fullPath, (err) => {
          if (!err) {
            console.log(`Removed ${entry.path}/`)
          }
        })
      } else {
        fs.unlink(entry.fullPath, (err) => {
          if (!err) {
            console.log(`Removed ${entry.path}`)
          }
        })
      }
    })
  })
}

/* eslint-enable no-warning-comments, no-inline-comments, line-comment-position, max-depth */
