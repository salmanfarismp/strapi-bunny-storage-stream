/// <reference types="node" />
import type { Readable } from "node:stream";
import type { Buffer } from "node:buffer";

export interface HybridProviderOptions {
  streamEnabled?: boolean | string | number;
  storage?: Record<string, unknown>;
  storageOptions?: Record<string, unknown>;
  stream?: Record<string, unknown>;
  streamOptions?: Record<string, unknown>;
  storageProviderPath?: string;
  streamProviderPath?: string;
}

export interface StrapiUploadFile {
  name?: string;
  hash?: string;
  ext?: string;
  mime?: string;
  buffer?: Buffer;
  stream?: Readable;
  path?: string;
  url?: string;
  provider_metadata?: Record<string, any>;
}

export interface StrapiUploadProviderAPI {
  upload(file: StrapiUploadFile): Promise<void>;
  uploadStream(file: StrapiUploadFile): Promise<void>;
  delete(file: StrapiUploadFile): Promise<void>;
}

export function init(
  config?: { providerOptions?: HybridProviderOptions } | HybridProviderOptions
): StrapiUploadProviderAPI;
