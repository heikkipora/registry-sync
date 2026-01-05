import * as https from 'https'
import axios from 'axios'
import {LRUCache} from 'lru-cache'
import type {AxiosRequestConfig, ResponseType} from 'axios'
import type {RegistryMetadata} from './types.d.ts'

const metadataCache = new LRUCache<string, RegistryMetadata>({max: 100})

const client = axios.create({
  httpsAgent: new https.Agent({keepAlive: true}),
  timeout: 30 * 1000
})

export async function fetchJsonWithCacheCloned(url: string, token: string): Promise<RegistryMetadata> {
  if (metadataCache.has(url)) {
    return structuredClone(metadataCache.get(url))
  }

  const value = await fetch<RegistryMetadata>(url, 'json', token)
  metadataCache.set(url, value)
  return structuredClone(value)
}

export function fetchBinaryData(url: string, token: string): Promise<Buffer> {
  return fetch<Buffer>(url, 'arraybuffer', token)
}

async function fetch<T>(url: string, responseType: ResponseType, token: string): Promise<T> {
  const config: AxiosRequestConfig = {responseType}
  if (token !== '') {
    config.headers = {authorization: 'Bearer ' + token}
  }
  return (await client.get<T>(url, config)).data
}
