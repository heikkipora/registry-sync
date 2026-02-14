import * as fs from 'fs'
import * as path from 'path'
import {describe, it} from 'node:test'
import assert from 'node:assert/strict'
import {dependenciesFromPackageLock, isNonRegistryYarnPackagePattern} from '../src/resolve.ts'

describe('resolve patterns', () => {
  describe('isNonRegistryYarnPackagePattern', () => {
    it('Should detect link: patterns', () => {
      assert.strictEqual(isNonRegistryYarnPackagePattern('link:./packages/dep'), true)
    })

    it('Should detect file: patterns', () => {
      assert.strictEqual(isNonRegistryYarnPackagePattern('file:../local-dep'), true)
    })

    it('Should detect relative path patterns', () => {
      assert.strictEqual(isNonRegistryYarnPackagePattern('./local-package'), true)
      assert.strictEqual(isNonRegistryYarnPackagePattern('../parent-package'), true)
    })

    it('Should detect absolute path patterns', () => {
      assert.strictEqual(isNonRegistryYarnPackagePattern('/absolute/path/to/package'), true)
    })

    it('Should detect http/https URL patterns', () => {
      assert.strictEqual(isNonRegistryYarnPackagePattern('http://example.com/pkg.tgz'), true)
      assert.strictEqual(isNonRegistryYarnPackagePattern('https://example.com/pkg.tgz'), true)
    })

    it('Should detect tarball patterns without @', () => {
      assert.strictEqual(isNonRegistryYarnPackagePattern('package.tgz'), true)
      assert.strictEqual(isNonRegistryYarnPackagePattern('package.tar.gz'), true)
    })

    it('Should detect github: patterns', () => {
      assert.strictEqual(isNonRegistryYarnPackagePattern('github:user/repo'), true)
    })

    it('Should detect shorthand github patterns', () => {
      assert.strictEqual(isNonRegistryYarnPackagePattern('user/repo'), true)
      assert.strictEqual(isNonRegistryYarnPackagePattern('user/repo#branch'), true)
    })

    it('Should detect gitlab: patterns', () => {
      assert.strictEqual(isNonRegistryYarnPackagePattern('gitlab:user/repo'), true)
    })

    it('Should detect bitbucket: patterns', () => {
      assert.strictEqual(isNonRegistryYarnPackagePattern('bitbucket:user/repo'), true)
    })

    it('Should detect gist: patterns', () => {
      assert.strictEqual(isNonRegistryYarnPackagePattern('gist:hash123'), true)
    })

    it('Should detect git: and git+ patterns', () => {
      assert.strictEqual(isNonRegistryYarnPackagePattern('git:github.com/user/repo.git'), true)
      assert.strictEqual(isNonRegistryYarnPackagePattern('git+https://github.com/user/repo.git'), true)
      assert.strictEqual(isNonRegistryYarnPackagePattern('git+ssh://git@github.com/user/repo.git'), true)
    })

    it('Should detect ssh: patterns', () => {
      assert.strictEqual(isNonRegistryYarnPackagePattern('ssh://git@github.com/user/repo.git'), true)
    })

    it('Should detect github.com/gitlab.com/bitbucket.org URLs with protocol', () => {
      assert.strictEqual(isNonRegistryYarnPackagePattern('https://github.com/user/repo'), true)
      assert.strictEqual(isNonRegistryYarnPackagePattern('https://gitlab.com/user/repo'), true)
      assert.strictEqual(isNonRegistryYarnPackagePattern('https://bitbucket.org/user/repo'), true)
    })

    it('Should return false for normal registry patterns', () => {
      assert.strictEqual(isNonRegistryYarnPackagePattern('^4.17.0'), false)
      assert.strictEqual(isNonRegistryYarnPackagePattern('~1.2.3'), false)
      assert.strictEqual(isNonRegistryYarnPackagePattern('>=1.0.0'), false)
      assert.strictEqual(isNonRegistryYarnPackagePattern('1.0.0'), false)
    })

    it('Should return false for npm: registry patterns', () => {
      assert.strictEqual(isNonRegistryYarnPackagePattern('npm:other-pkg@^1.0.0'), false)
    })
  })

  describe('npm lockfile local dependency filtering', () => {
    it('Should filter out file: dependencies from package-lock.json', async () => {
      const packages = await dependenciesFromPackageLock(
        `${import.meta.dirname}/manifests/package-lock.json`,
        false
      )
      const filePackages = packages.filter(p => p.version.startsWith('file:'))
      assert.strictEqual(filePackages.length, 0, 'no file: dependencies should be present')
    })
  })

  describe('unsupported lockfile version', () => {
    it('Should throw for unsupported package-lock.json version', async () => {
      const tmpLockfile = path.join(import.meta.dirname, '.tmp-lockfile.json')
      await fs.promises.writeFile(tmpLockfile, JSON.stringify({
        name: 'test',
        lockfileVersion: 1,
        packages: {}
      }))
      try {
        await assert.rejects(
          () => dependenciesFromPackageLock(tmpLockfile, false),
          {message: 'Unsupported package-lock.json version 1'}
        )
      } finally {
        await fs.promises.unlink(tmpLockfile).catch(() => {})
      }
    })
  })

  describe('deduplication and sorting', () => {
    it('Should return unique packages sorted by id', async () => {
      const packages = await dependenciesFromPackageLock(
        `${import.meta.dirname}/manifests/package-lock.json`,
        false
      )
      for (let i = 1; i < packages.length; i++) {
        assert.ok(
          packages[i].id.localeCompare(packages[i - 1].id) > 0,
          `packages should be sorted: ${packages[i - 1].id} should come before ${packages[i].id}`
        )
      }
      const ids = packages.map(p => p.id)
      const uniqueIds = [...new Set(ids)]
      assert.strictEqual(ids.length, uniqueIds.length, 'all package ids should be unique')
    })
  })
})
