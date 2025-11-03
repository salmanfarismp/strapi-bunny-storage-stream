# strapi-plugin-bunny-storage-stream

Hybrid upload provider for Strapi v5 that routes general files/images to Bunny.net Object Storage and videos to Bunny Stream (when enabled). This package only adds packaging metadata; underlying code lives in `index.js` and internal sub-directories.

## Install

```bash
npm i strapi-plugin-bunny-storage-stream
# or
yarn add strapi-plugin-bunny-storage-stream
```

## Configure (Strapi v5)

In `config/plugins.ts` (or `config/plugins.js`):

```ts
export default () => ({
  upload: {
    config: {
      provider: "strapi-plugin-bunny-storage-stream",
      providerOptions: {
        // Enable routing videos to Bunny Stream
        streamEnabled: env("BUNNY_STREAM_ENABLED", "false") === "true",

        // Child provider options
        // Storage (Object Storage) options
        storage: {
          storageZone: env("BUNNY_STORAGE_ZONE", "your-storage-name"),
          accessKey: env(
            "BUNNY_ACCESS_KEY",
            "abcd1234-abcd-1234-123456789abc-1234-1234"
          ),
          storageHost: env("BUNNY_STORAGE_HOST", "storage.bunnycdn.com"),
          baseDir: env("BUNNY_BASE_DIR", ""), // eg. local, strapi // to arrage them better
          cdnBaseUrl: env("BUNNY_CDN_BASE_URL", "plzn.b-cdn.net"),
        },
        // Stream options (only used when streamEnabled=true)
        stream: {
          libraryId: env("BUNNY_STREAM_LIBRARY_ID", "123456"),
          apiKey: env(
            "BUNNY_STREAM_API_KEY",
            "thisisad-iffe-rent-keyabo123456-1234-1234"
          ),
          collectionId: env("BUNNY_STREAM_COLLECTION_ID"), // optional
          embedBase: env("BUNNY_STREAM_EMBED_BASE"), // CDN Hostname
        },
      },
    },
  },
});
```

Notes:

- `streamEnabled` controls whether videos are handled by Bunny Stream. When `false`, all uploads go to Object Storage.
- The hybrid provider uses simple MIME detection (`video/*`) to decide routing for uploads; deletions prefer Stream when a `provider_metadata.videoId` is present.
- If you bundle the child providers within this package in your app, ensure their paths resolve (default paths use `process.cwd()/providers/...`).

## Exports / Entry

- CommonJS entry: `index.js`
- This package includes internal directories:
  - `strapi-provider-upload-bunny/**`
  - `strapi-provider-upload-bunny-stream/**`

## License

MIT
