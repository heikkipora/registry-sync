import request from 'request-promise'

const metadataCache = {}
const timeout = 60 * 1000

export async function fetchUrl(url, isBinary = false) {
  if (isBinary) {
    return fetchBinary(url)
  }

  if (!metadataCache[url]) {
    metadataCache[url] = await fetchJson(url)
  }
  return metadataCache[url]
}

function fetchBinary(url) {
  return request({encoding: null, url, timeout})
}

async function fetchJson(url) {
  const body = await request({gzip: true, url, timeout})
  return JSON.parse(body)
}
