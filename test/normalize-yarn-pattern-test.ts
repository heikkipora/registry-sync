import {describe, it} from 'node:test'
import assert from 'node:assert/strict'
import {normalizeYarnPackagePattern} from '../src/normalize-yarn-pattern.ts'

describe('normalizeYarnPackagePattern', () => {
  it('Should parse a simple package name without version', () => {
    assert.deepStrictEqual(normalizeYarnPackagePattern('lodash'), {
      name: 'lodash',
      range: 'latest',
      hasVersion: false
    })
  })

  it('Should parse a package name with version', () => {
    assert.deepStrictEqual(normalizeYarnPackagePattern('lodash@^4.17.0'), {
      name: 'lodash',
      range: '^4.17.0',
      hasVersion: true
    })
  })

  it('Should parse a scoped package without version', () => {
    assert.deepStrictEqual(normalizeYarnPackagePattern('@babel/core'), {
      name: '@babel/core',
      range: 'latest',
      hasVersion: false
    })
  })

  it('Should parse a scoped package with version', () => {
    assert.deepStrictEqual(normalizeYarnPackagePattern('@babel/core@^7.0.0'), {
      name: '@babel/core',
      range: '^7.0.0',
      hasVersion: true
    })
  })

  it('Should handle a package with @ but empty version', () => {
    assert.deepStrictEqual(normalizeYarnPackagePattern('lodash@'), {
      name: 'lodash',
      range: '*',
      hasVersion: false
    })
  })

  it('Should handle a scoped package with npm: protocol in version', () => {
    assert.deepStrictEqual(normalizeYarnPackagePattern('@scope/pkg@npm:other-pkg@^1.0.0'), {
      name: '@scope/pkg',
      range: 'npm:other-pkg@^1.0.0',
      hasVersion: true
    })
  })
})
