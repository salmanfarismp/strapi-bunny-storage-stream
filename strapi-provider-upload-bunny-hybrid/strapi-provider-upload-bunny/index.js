// Bunny.net upload provider for Strapi v5
// Exposes upload, uploadStream, and delete methods

function normalizePath(...parts) {
  const joined = parts
    .filter(Boolean)
    .map((p) => String(p))
    .join("/");
  return joined
    .replace(/\\/g, "/")
    .replace(/\/+/, "/")
    .replace(/(^\/)|(\/$)/g, "");
}

async function bufferFromStream(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

module.exports = {
  init(config = {}) {
    const providerOptions = config.providerOptions || config;

    const storageZone = providerOptions.storageZone;
    const accessKey = providerOptions.accessKey;
    const storageHost = providerOptions.storageHost || "storage.bunnycdn.com";
    const baseDir = providerOptions.baseDir || "";
    const cdnBaseUrl = providerOptions.cdnBaseUrl; // e.g. https://your-pull-zone.b-cdn.net

    if (!storageZone)
      throw new Error("Bunny provider: storageZone is required");
    if (!accessKey) throw new Error("Bunny provider: accessKey is required");
    if (!cdnBaseUrl) throw new Error("Bunny provider: cdnBaseUrl is required");

    function resolveObjectPath(file) {
      const folderPath = file.path || ""; // Strapi can set file.path for folders
      const fileName = `${file.hash}${file.ext}`;
      return normalizePath(baseDir, folderPath, fileName);
    }

    async function putToBunny(objectPath, body, contentType) {
      const url = `https://${storageHost}/${encodeURIComponent(storageZone)}/${objectPath}`;
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          AccessKey: accessKey,
          "Content-Type": contentType || "application/octet-stream",
        },
        body,
      });
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(
          `Bunny upload failed: ${response.status} ${response.statusText} ${text}`
        );
      }
    }

    async function deleteFromBunny(objectPath) {
      const url = `https://${storageHost}/${encodeURIComponent(storageZone)}/${objectPath}`;
      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          AccessKey: accessKey,
        },
      });
      if (!response.ok && response.status !== 404) {
        const text = await response.text().catch(() => "");
        throw new Error(
          `Bunny delete failed: ${response.status} ${response.statusText} ${text}`
        );
      }
    }

    function setPublicUrl(file, objectPath) {
      const publicUrl = `${cdnBaseUrl.replace(/\/$/, "")}/${objectPath}`;
      file.url = publicUrl;
    }

    return {
      async upload(file) {
        const objectPath = resolveObjectPath(file);
        const content = file.buffer || file.stream;
        let buffer = file.buffer;
        if (!buffer && file.stream) {
          buffer = await bufferFromStream(file.stream);
        }
        if (!buffer)
          throw new Error("Bunny provider: file buffer/stream is required");

        await putToBunny(objectPath, buffer, file.mime);
        setPublicUrl(file, objectPath);
      },

      async uploadStream(file) {
        const objectPath = resolveObjectPath(file);
        let buffer = file.buffer;
        if (!buffer && file.stream) {
          buffer = await bufferFromStream(file.stream);
        }
        if (!buffer)
          throw new Error("Bunny provider: readable stream is required");

        await putToBunny(objectPath, buffer, file.mime);
        setPublicUrl(file, objectPath);
      },

      async delete(file) {
        const objectPath = resolveObjectPath(file);
        await deleteFromBunny(objectPath);
      },
    };
  },
};
