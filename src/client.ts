import * as https from 'https'
import type {HTTPGetConfig, RegistryMetadata} from './types'
import axios, {ResponseType} from 'axios'

const metadataCache: {[url: string]: RegistryMetadata} = {}

const client = axios.create({
  httpsAgent: new https.Agent({keepAlive: true}),
  timeout: 30 * 1000
})

export async function fetchJsonWithCacheCloned(url: string, token: string): Promise<RegistryMetadata> {
  if (!metadataCache[url]) {
    // eslint-disable-next-line require-atomic-updates
    metadataCache[url] = await fetch<RegistryMetadata>(url, 'json', token)
  }
  return cloneDeep(metadataCache[url])
}

function cloneDeep(metadata: RegistryMetadata): RegistryMetadata {
  return JSON.parse(JSON.stringify(metadata))
}

export function fetchBinaryData(url: string, token: string): Promise<Buffer> {
  return fetch<Buffer>(url, 'arraybuffer', token)
}

async function fetch<T>(url: string, responseType: ResponseType, token: string): Promise<T> {
  const config: HTTPGetConfig = {responseType}
  if (token !== null) {
    config.headers = {authorization: 'Bearer ' + token}
  }
  return (await client.get<T>(url, config)).data
}
