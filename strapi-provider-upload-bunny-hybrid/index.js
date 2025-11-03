// Bunny.net Hybrid provider for Strapi v5
// Delegates to Object Storage provider for general files/images
// and to Bunny Stream provider for videos when enabled.
/**
 * This module exposes a Strapi upload provider with `init(config)` that returns
 * `{ upload, uploadStream, delete }`. It selects a child provider at runtime
 * based on feature-flag and MIME type.
 */

const path = require("path");

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function toBoolean(value) {
  if (typeof value === "boolean") return value;
  if (value == null) return false;
  const str = String(value).trim().toLowerCase();
  return str === "1" || str === "true" || str === "yes" || str === "on";
}

function isVideo(file) {
  return (
    !!file?.mime &&
    typeof file.mime === "string" &&
    file.mime.startsWith("video/")
  );
}

function assertProviderApi(provider, name) {
  if (!provider || typeof provider !== "object") {
    throw new Error(
      `Hybrid provider: ${name} resolved to an invalid provider instance`
    );
  }
  for (const method of ["upload", "delete"]) {
    if (typeof provider[method] !== "function") {
      throw new Error(
        `Hybrid provider: ${name} is missing required method: ${method}`
      );
    }
  }
}

function safeRequireProvider(resolvedPath, label) {
  try {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    return require(resolvedPath);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Hybrid provider: failed to require ${label} at ${resolvedPath}: ${message}`
    );
  }
}

module.exports = {
  init(config = {}) {
    const providerOptions = config.providerOptions || config;

    // Feature flag: enable/disable Stream for videos
    const streamEnabled = toBoolean(providerOptions.streamEnabled);

    // Child provider configs
    const storageOptions =
      providerOptions.storage || providerOptions.storageOptions || {};
    const streamOptions =
      providerOptions.stream || providerOptions.streamOptions || {};

    // Resolve child providers using absolute paths to avoid resolution issues in Docker
    const storageProviderPath = path.resolve(
      __dirname,
      "strapi-provider-upload-bunny"
    );
    const streamProviderPath = path.resolve(
      __dirname,
      "strapi-provider-upload-bunny-stream"
    );

    // Instantiate providers
    const storageModule = safeRequireProvider(
      storageProviderPath,
      "storage provider module"
    );
    const storageProvider = storageModule.init
      ? storageModule.init(storageOptions)
      : storageModule(storageOptions);
    assertProviderApi(storageProvider, "storage provider");

    const streamModule = streamEnabled
      ? safeRequireProvider(streamProviderPath, "stream provider module")
      : null;
    const streamProvider = streamModule
      ? streamModule.init
        ? streamModule.init(streamOptions)
        : streamModule(streamOptions)
      : null;
    if (streamProvider) assertProviderApi(streamProvider, "stream provider");

    function chooseProviderForUpload(file) {
      if (streamEnabled && isVideo(file)) return streamProvider;
      return storageProvider;
    }

    function chooseProviderForDelete(file) {
      // If it has a Bunny Stream videoId, delete via stream
      if (streamEnabled && file?.provider_metadata?.videoId && streamProvider)
        return streamProvider;
      return storageProvider;
    }

    const api = {
      async upload(file) {
        const p = chooseProviderForUpload(file);
        if (!p)
          throw new Error("Hybrid provider: No provider available for upload");
        return p.upload(file);
      },

      async uploadStream(file) {
        const p = chooseProviderForUpload(file);
        if (!p)
          throw new Error(
            "Hybrid provider: No provider available for uploadStream"
          );
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
    return Object.freeze(api);
  },
};
