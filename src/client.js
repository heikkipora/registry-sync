import axios from 'axios'
import https from 'https'

const metadataCache = {}
const client = axios.create({
  httpsAgent: new https.Agent({keepAlive: true}),
  timeout: 10 * 1000
})

export async function fetchUrl(url, isBinary = false) {
  if (isBinary) {
    return fetch(url, 'arraybuffer')
  }

  if (!metadataCache[url]) {
    metadataCache[url] = await fetch(url, 'json')
  }
  return metadataCache[url]
}

async function fetch(url, responseType) {
  return (await client.get(url, {responseType})).data
}
