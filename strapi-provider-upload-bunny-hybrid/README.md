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
      provider: 'strapi-plugin-bunny-storage-stream',
      providerOptions: {
        // Enable routing videos to Bunny Stream
        streamEnabled: process.env.BUNNY_STREAM_ENABLED === 'true',

        // Child provider options
        storage: {
          // Bunny Object Storage credentials/options
          // e.g. storageZone, region, accessKey, publicUrl, etc.
        },
        stream: {
          // Bunny Stream credentials/options
          // e.g. libraryId, apiKey, cdnBaseUrl, etc.
        },

        // Optional: override where child providers resolve from
        // Defaults assume colocated providers within your app's `providers/` directory
        // storageProviderPath: path.resolve(process.cwd(), 'providers', 'strapi-provider-upload-bunny'),
        // streamProviderPath: path.resolve(process.cwd(), 'providers', 'strapi-provider-upload-bunny-stream'),
      },
    },
  },
});
```

Notes:
- `streamEnabled` controls whether videos are handled by Bunny Stream. When `false`, all uploads go to Object Storage.
- The hybrid provider uses simple MIME detection (`video/*`) to decide routing for uploads; deletions prefer Stream when a `provider_metadata.videoId` is present.
- If you bundle the child providers within this package in your app, ensure their paths resolve (default paths use `process.cwd()/providers/...`).

## Environment variables (example)

```env
BUNNY_STREAM_ENABLED=true
BUNNY_STORAGE_ZONE=your-zone
BUNNY_STORAGE_ACCESS_KEY=your-access-key
BUNNY_STORAGE_REGION=de
BUNNY_STREAM_LIBRARY_ID=12345
BUNNY_STREAM_API_KEY=your-stream-api-key
```

## Exports / Entry

- CommonJS entry: `index.js`
- This package includes internal directories:
  - `strapi-provider-upload-bunny/**`
  - `strapi-provider-upload-bunny-stream/**`

## License

MIT

