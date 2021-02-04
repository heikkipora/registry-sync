import * as https from 'https'
import type {RegistryMetadata} from './types'
import axios, {ResponseType} from 'axios'

const metadataCache: {[url: string]: RegistryMetadata} = {}

const client = axios.create({
  httpsAgent: new https.Agent({keepAlive: true}),
  timeout: 30 * 1000
})

export async function fetchJsonWithCacheCloned(url: string): Promise<RegistryMetadata> {
  if (!metadataCache[url]) {
    // eslint-disable-next-line require-atomic-updates
    metadataCache[url] = await fetch<RegistryMetadata>(url, 'json')
  }
  return cloneDeep(metadataCache[url])
}

function cloneDeep(metadata: RegistryMetadata): RegistryMetadata {
  return JSON.parse(JSON.stringify(metadata))
}

export function fetchBinaryData(url: string): Promise<Buffer> {
  return fetch<Buffer>(url, 'arraybuffer')
}

async function fetch<T>(url: string, responseType: ResponseType): Promise<T> {
  return (await client.get<T>(url, {responseType})).data
}
