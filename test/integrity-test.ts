import {describe, it} from 'node:test'
import assert from 'node:assert/strict'
import {verifyIntegrity, sha1, sha512} from '../src/integrity.ts'

const testData = Buffer.from('hello world')

describe('integrity', () => {
  describe('sha1', () => {
    it('Should generate a consistent SHA1 hex digest', () => {
      const hash = sha1(testData)
      assert.strictEqual(hash, '2aae6c35c94fcfb415dbe95f408b9ce91ee846ed')
    })

    it('Should generate different hashes for different data', () => {
      const hash1 = sha1(Buffer.from('data1'))
      const hash2 = sha1(Buffer.from('data2'))
      assert.notStrictEqual(hash1, hash2)
    })
  })

  describe('sha512', () => {
    it('Should generate a SHA512 integrity string', () => {
      const hash = sha512(testData)
      assert.ok(hash.startsWith('sha512-'))
    })

    it('Should generate a consistent SHA512 hash', () => {
      const hash1 = sha512(testData)
      const hash2 = sha512(testData)
      assert.strictEqual(hash1, hash2)
    })

    it('Should generate different hashes for different data', () => {
      const hash1 = sha512(Buffer.from('data1'))
      const hash2 = sha512(Buffer.from('data2'))
      assert.notStrictEqual(hash1, hash2)
    })
  })

  describe('verifyIntegrity', () => {
    it('Should pass when integrity matches', () => {
      const integrity = sha512(testData)
      assert.doesNotThrow(() => verifyIntegrity(testData, 'test@1.0.0', {integrity}))
    })

    it('Should pass when shasum matches and no integrity provided', () => {
      const shasum = sha1(testData)
      assert.doesNotThrow(() => verifyIntegrity(testData, 'test@1.0.0', {shasum}))
    })

    it('Should throw when integrity does not match', () => {
      assert.throws(
        () => verifyIntegrity(testData, 'test@1.0.0', {integrity: 'sha512-invalidhash'}),
        {message: 'Integrity check failed for test@1.0.0'}
      )
    })

    it('Should throw when shasum does not match', () => {
      assert.throws(
        () => verifyIntegrity(testData, 'test@1.0.0', {shasum: 'deadbeef'}),
        {message: 'Integrity check with SHA1 failed for failed for test@1.0.0'}
      )
    })

    it('Should throw when neither integrity nor shasum is provided', () => {
      assert.throws(
        () => verifyIntegrity(testData, 'test@1.0.0', {}),
        {message: 'Integrity values not present in metadata for test@1.0.0'}
      )
    })

    it('Should prefer integrity over shasum when both are provided', () => {
      const integrity = sha512(testData)
      assert.doesNotThrow(() => verifyIntegrity(testData, 'test@1.0.0', {integrity, shasum: 'wrongsha'}))
    })
  })
})
