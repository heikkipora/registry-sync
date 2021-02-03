import * as ssri from 'ssri'

export function verifyIntegrity(data: Buffer, id: string, {integrity, shasum}: {integrity?: string, shasum?: string}): void {
  if (!integrity && !shasum) {
    throw new Error(`Integrity values not present in metadata for ${id}`)
  }

  if (integrity) {
    if (!ssri.checkData(data, integrity)) {
      throw new Error(`Integrity check failed for ${id}`)
    }
  } else if (sha1(data) != shasum) {
    throw new Error(`Integrity check with SHA1 failed for failed for ${id}`)
  }
}

export function sha1(data: Buffer): string {
  return ssri.fromData(data, {algorithms: ['sha1']}).hexDigest()
}

export function sha512(data: Buffer): string {
  return ssri.fromData(data, {algorithms: ['sha512']}).toString()
}
