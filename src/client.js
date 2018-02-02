import request from 'request-promise'

const metadataCache = {}
const timeout = 60 * 1000

export async function fetchUrl(url, isBinary = false) {
  if (metadataCache[url]) {
    return metadataCache[url]
  }

  const encoding = isBinary ? null : 'utf8'
  const body = await request({encoding, url, timeout})
  return cacheMetadata(url, parseJson(body, isBinary))
}

function cacheMetadata(url, body) {
  if (!url.endsWith('.tgz')) {
    metadataCache[url] = body
  }
  return body
}

function parseJson(body, isBinary) {
  return isBinary ? body : JSON.parse(body)
}
