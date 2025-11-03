// Bunny.net Hybrid provider for Strapi v5
// Delegates to Object Storage provider for general files/images
// and to Bunny Stream provider for videos when enabled.

const path = require("path");

function isVideo(file) {
  return !!file?.mime && typeof file.mime === "string" && file.mime.startsWith("video/");
}

module.exports = {
  init(config = {}) {
    const providerOptions = config.providerOptions || config;

    // Feature flag: enable/disable Stream for videos
    const streamEnabledRaw = providerOptions.streamEnabled;
    const streamEnabled = String(streamEnabledRaw ?? "false").toLowerCase() === "true";

    // Child provider configs
    const storageOptions = providerOptions.storage || providerOptions.storageOptions || {};
    const streamOptions = providerOptions.stream || providerOptions.streamOptions || {};

    // Resolve child providers using absolute paths to avoid resolution issues in Docker
    const storageProviderPath = providerOptions.storageProviderPath || path.resolve(process.cwd(), "providers", "strapi-provider-upload-bunny");
    const streamProviderPath = providerOptions.streamProviderPath || path.resolve(process.cwd(), "providers", "strapi-provider-upload-bunny-stream");

    // Instantiate providers
    const storageProvider = require(storageProviderPath).init(storageOptions);
    const streamProvider = streamEnabled ? require(streamProviderPath).init(streamOptions) : null;

    function chooseProviderForUpload(file) {
      if (streamEnabled && isVideo(file)) return streamProvider;
      return storageProvider;
    }

    function chooseProviderForDelete(file) {
      // If it has a Bunny Stream videoId, delete via stream
      if (streamEnabled && file?.provider_metadata?.videoId && streamProvider) return streamProvider;
      return storageProvider;
    }

    return {
      async upload(file) {
        const p = chooseProviderForUpload(file);
        if (!p) throw new Error("Hybrid provider: No provider available for upload");
        return p.upload(file);
      },

      async uploadStream(file) {
        const p = chooseProviderForUpload(file);
        if (!p) throw new Error("Hybrid provider: No provider available for uploadStream");
        // Reuse upload to simplify
        if (typeof p.uploadStream === "function") return p.uploadStream(file);
        return p.upload(file);
      },

      async delete(file) {
        const p = chooseProviderForDelete(file);
        if (!p) return; // nothing to delete
        return p.delete(file);
      },
    };
  },
};


