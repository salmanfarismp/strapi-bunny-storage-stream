// Bunny.net Stream upload provider for Strapi v5
// Handles ONLY video uploads via Bunny Stream API

function assertVideo(file) {
  if (!file || typeof file.mime !== "string" || !file.mime.startsWith("video/")) {
    throw new Error("Bunny Stream provider: only video/* mime types are supported");
  }
}

async function bufferFromStream(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function createVideo({ apiKey, libraryId, title, collectionId }) {
  const url = `https://video.bunnycdn.com/library/${encodeURIComponent(libraryId)}/videos`;
  const body = { title };
  if (collectionId) body.collectionId = collectionId;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      AccessKey: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Bunny Stream: create video failed: ${res.status} ${res.statusText} ${text}`);
  }
  const json = await res.json();
  // Expect shape containing guid or videoId
  const videoId = json?.guid || json?.id || json?.videoId;
  if (!videoId) throw new Error("Bunny Stream: could not resolve created video id");
  return { videoId };
}

async function uploadVideoBytes({ apiKey, libraryId, videoId, mime, bytes }) {
  const url = `https://video.bunnycdn.com/library/${encodeURIComponent(libraryId)}/videos/${encodeURIComponent(videoId)}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      AccessKey: apiKey,
      "Content-Type": mime || "application/octet-stream",
    },
    body: bytes,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Bunny Stream: upload bytes failed: ${res.status} ${res.statusText} ${text}`);
  }
}

async function deleteVideo({ apiKey, libraryId, videoId }) {
  const url = `https://video.bunnycdn.com/library/${encodeURIComponent(libraryId)}/videos/${encodeURIComponent(videoId)}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { AccessKey: apiKey },
  });
  if (!res.ok && res.status !== 404) {
    const text = await res.text().catch(() => "");
    throw new Error(`Bunny Stream: delete failed: ${res.status} ${res.statusText} ${text}`);
  }
}

module.exports = {
  init(config = {}) {
    const providerOptions = config.providerOptions || config;

    const apiKey = providerOptions.apiKey;
    const libraryId = providerOptions.libraryId;
    const collectionId = providerOptions.collectionId;
    const embedBase = (providerOptions.embedBase || "https://iframe.mediadelivery.net").replace(/\/$/, "");

    if (!apiKey) throw new Error("Bunny Stream provider: apiKey is required");
    if (!libraryId) throw new Error("Bunny Stream provider: libraryId is required");

    function setPublicUrl(file, videoId) {
      // Embed URL format
      const publicUrl = `${embedBase}/embed/${libraryId}/${videoId}`;
      file.url = publicUrl;
      file.provider_metadata = { videoId };
    }

    return {
      async upload(file) {
        assertVideo(file);
        let buffer = file.buffer;
        if (!buffer && file.stream) {
          buffer = await bufferFromStream(file.stream);
        }
        if (!buffer) throw new Error("Bunny Stream provider: file buffer/stream is required");

        const title = file.name || `${file.hash}${file.ext}` || "video";
        const { videoId } = await createVideo({ apiKey, libraryId, title, collectionId });
        await uploadVideoBytes({ apiKey, libraryId, videoId, mime: file.mime, bytes: buffer });
        setPublicUrl(file, videoId);
      },

      async uploadStream(file) {
        // Using buffer approach for simplicity and compatibility
        return this.upload(file);
      },

      async delete(file) {
        const videoId = file?.provider_metadata?.videoId;
        if (!videoId) return; // nothing to delete or unknown id
        await deleteVideo({ apiKey, libraryId, videoId });
      },
    };
  },
};


