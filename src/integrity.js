import ssri from 'ssri'

export function verifyIntegrity(data, id, {integrity, shasum}) {
  if (!integrity && !shasum) {
    throw new Error(`Integrity values not present in metadata for ${id}`)
  }

  if (integrity) {
    if (sha512(data) != integrity) {
      throw new Error(`Integrity check with SHA512 failed for ${id}`)
    }
  } else if (sha1(data) != shasum) {
    throw new Error(`Integrity check with SHA1 failed for failed for ${id}`)
  }
}

export function sha1(data) {
  const [integrity] = ssri.fromData(data, {algorithms: ['sha1']}).sha1
  return integrity.hexDigest()
}

export function sha512(data) {
  const [integrity] = ssri.fromData(data, {algorithms: ['sha512']}).sha512
  return integrity.toString()
}
