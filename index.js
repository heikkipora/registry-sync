var _ = require('lodash')
var Bacon = require('baconjs')
var fs = require('fs')
var mkdirp = require('mkdirp')
var path = require('path')
var request = require('request')
var semver = require('semver')
var url = require('url')

var argv = require('minimist')(process.argv.slice(2));
var NPMJS_URL = argv.rootUrl || 'https://registry.npmjs.org'

var rootPackage = argv.packageJson
if (!rootPackage) {
  throw new Error('Mandatory parameter --packageJson missing')
}

var targetFolder = argv.targetFolder
if (!targetFolder) {
  throw new Error('Mandatory parameter --targetFolder missing')
}

const responseCache = {}

function fetchUrl(url) {
  if (responseCache[url]) {
    return Bacon.later(0, responseCache[url])
  }

  return Bacon.fromNodeCallback((callback) => {
    request(url, (error, response, body) => {
      if (!error && response.statusCode == 200) {
        if (!url.endsWith('.tgz')) {
          responseCache[url] = body
        }
        callback(null, body)
      } else {
        const statusCode = response ? response.statusCode : 'n/a'
        callback(`Failed to fetch ${url} because of error '${error}' and/or HTTP status ${statusCode}`)
      }
    })
  })
}

function fetchMetadata(name) {
  return fetchUrl(url.resolve(NPMJS_URL, name)).map(JSON.parse)
}

function fetchVersionMetadata(name, version) {
  return fetchUrl(url.resolve(NPMJS_URL, name + '/' + version)).map(JSON.parse)
}

function fetchBinary(name, version) {
  return fetchUrl(url.resolve(NPMJS_URL, name + '/-/' + version + '/' + packageFilename(name, version)))
}

function dependenciesToArray(dependencies) {
  return Object.keys(dependencies || {}).map(function(key) {
    return { name: key, versionRange: dependencies[key] }
  })
}

function packageFilename(name, version) {
    return name + '-' + version + '.tgz'
}

function packageMetadataFilePath(name) {
  mkdirp.sync(path.resolve(targetFolder, name))
  return path.resolve(targetFolder, name + '/index.json')
}

function packageVersionMetadataFilePath(name, version) {
  mkdirp.sync(path.resolve(targetFolder, name, version))
  return path.resolve(targetFolder, name + '/' + version + '/index.json')
}

function packageBinaryFilePath(name, version) {
  return path.resolve(targetFolder, name + '/' + version + '/' + packageFilename(name, version))
}

var collectedPackages = {}

function collectPackage(package) {
  var versions = collectedPackages[package.name] || []
  if (versions.indexOf(package.version) != -1) {
    return false
  }
  versions.push(package.version)
  collectedPackages[package.name] = versions
  return true
}

function collectedPackagesAsArray() {
  return Object.keys(collectedPackages).map(function(name) {
    return { name: name, versions: collectedPackages[name] }
  })
}

function resolveVersionAndDependencies(package) {
  return fetchMetadata(package.name)
         .map(function(metadata) {
           var available = Object.keys(metadata.versions)
           var version = semver.maxSatisfying(available, package.versionRange)
           return {name: package.name, version: version, dependencies: dependenciesToArray(metadata.versions[version].dependencies)}
         })
         .flatMap(function(packageAndDependencies) {
           if (collectPackage(packageAndDependencies)) {
             return Bacon.fromArray(packageAndDependencies.dependencies)
                         .flatMapWithConcurrencyLimit(5, resolveVersionAndDependencies)
           }
           return Bacon.never()
         })
}

function downloadPackage(nameAndVersions) {
  function cleanupMetadata(metadataContent, versions) {
    var content = _.cloneDeep(metadataContent)
    Object.keys(content.versions).forEach(function(version) {
      if (versions.indexOf(version) == -1) {
        delete content.versions[version]
      }
    })
    return content
  }

  return fetchMetadata(nameAndVersions.name)
           .doAction(function(metadataContent) {
             fs.writeFileSync(packageMetadataFilePath(nameAndVersions.name), JSON.stringify(cleanupMetadata(metadataContent, nameAndVersions.versions)))
           })
           .flatMap(function(metadataContent) {
             var paired = nameAndVersions.versions.map(function(version) {
               return {name: nameAndVersions.name, version: version}
             })
             return Bacon.fromArray(paired)
           })
           .flatMap(function(nameAndVersion) {
             return fetchVersionMetadata(nameAndVersion.name, nameAndVersion.version)
                      .doAction(function(metadataContent) {
                        fs.writeFileSync(packageVersionMetadataFilePath(nameAndVersions.name, nameAndVersion.version), JSON.stringify(metadataContent))
                      })
                      .map(nameAndVersion)
           })
           .flatMap(function(nameAndVersion) {
             return fetchBinary(nameAndVersion.name, nameAndVersion.version)
                      .doAction(function(data) {
                        fs.writeFileSync(packageBinaryFilePath(nameAndVersion.name, nameAndVersion.version), data)
                      })
           })
           .map(function() {
             return nameAndVersion.name + '@' + nameAndVersion.version
           })
}

var dependencies = dependenciesToArray(require(rootPackage).dependencies)
var downloaded = Bacon.fromArray(dependencies)
     .flatMap(resolveVersionAndDependencies)
     .mapEnd(collectedPackagesAsArray)
     .flatMap(Bacon.fromArray)
     .flatMap(downloadPackage)

downloaded.log()

downloaded.onError(function(err) {
  throw new Error(err)
})
