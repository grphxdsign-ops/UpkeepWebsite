import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve("assets/framer-free");
const MAX_ASSET_BYTES = 25 * 1024 * 1024;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) UpkeepAssetCollector/1.0";

const SOURCES = {
  marketplace: "https://www.framer.com/marketplace/components/",
  university: "https://framer.university/resources",
  hyperframer: "https://www.hyperframer.com/",
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function cleanText(value = "") {
  return String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8217;/g, "'")
    .replace(/&#8211;/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function safeName(value = "asset") {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90) || "asset";
}

function absoluteUrl(url, base) {
  if (!url) return null;
  let out = String(url)
    .replace(/\\u0026/g, "&")
    .replace(/\\\//g, "/")
    .replace(/&amp;/g, "&")
    .trim();
  if (out.startsWith("//")) out = `https:${out}`;
  if (out.startsWith("#") || out.startsWith("mailto:")) return null;
  try {
    return new URL(out, base).toString();
  } catch {
    return null;
  }
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function extFromType(type = "", fallback = ".bin") {
  const clean = type.split(";")[0].trim().toLowerCase();
  if (clean.includes("javascript")) return ".js";
  if (clean === "image/jpeg") return ".jpg";
  if (clean === "image/png") return ".png";
  if (clean === "image/webp") return ".webp";
  if (clean === "image/gif") return ".gif";
  if (clean === "image/svg+xml") return ".svg";
  if (clean === "video/mp4") return ".mp4";
  if (clean === "text/html") return ".html";
  if (clean === "application/json") return ".json";
  return fallback;
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { "user-agent": UA } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
  return response.text();
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { "user-agent": UA } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
  return response.json();
}

function extractHrefUrls(html, base) {
  const hrefs = [...html.matchAll(/href=["']([^"']+)["']/gi)].map((match) =>
    absoluteUrl(match[1], base),
  );
  const srcs = [...html.matchAll(/src=["']([^"']+)["']/gi)].map((match) =>
    absoluteUrl(match[1], base),
  );
  const rawHttps = [...html.matchAll(/https?:\\?\/\\?\/[^"'<>\s)]+/gi)].map((match) =>
    absoluteUrl(match[0], base),
  );
  return unique([...hrefs, ...srcs, ...rawHttps]);
}

async function downloadSmallAsset(url, folder, stem, manifestRecord) {
  try {
    const head = await fetch(url, { method: "HEAD", headers: { "user-agent": UA } });
    const length = Number(head.headers.get("content-length") || 0);
    const type = head.headers.get("content-type") || "";
    if (length && length > MAX_ASSET_BYTES) {
      manifestRecord.skippedDownloads.push({
        url,
        reason: `larger than ${Math.round(MAX_ASSET_BYTES / 1024 / 1024)}MB`,
        bytes: length,
      });
      return null;
    }

    const response = await fetch(url, { headers: { "user-agent": UA } });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const chunks = [];
    let total = 0;
    for await (const chunk of response.body) {
      total += chunk.length;
      if (total > MAX_ASSET_BYTES) {
        manifestRecord.skippedDownloads.push({
          url,
          reason: `stream exceeded ${Math.round(MAX_ASSET_BYTES / 1024 / 1024)}MB`,
          bytes: total,
        });
        return null;
      }
      chunks.push(chunk);
    }
    const contentType = response.headers.get("content-type") || type;
    const urlPath = new URL(url).pathname;
    const ext = path.extname(urlPath).split("?")[0] || extFromType(contentType);
    const filename = `${safeName(stem)}${ext}`;
    const target = path.join(folder, filename);
    await writeFile(target, Buffer.concat(chunks));
    return {
      url,
      file: path.relative(ROOT, target).replaceAll("\\", "/"),
      bytes: total,
      contentType,
    };
  } catch (error) {
    manifestRecord.failedDownloads.push({ url, reason: error.message });
    return null;
  }
}

async function collectMarketplace() {
  const outDir = path.join(ROOT, "framer-marketplace");
  const moduleDir = path.join(outDir, "modules");
  const mediaDir = path.join(outDir, "media");
  await mkdir(moduleDir, { recursive: true });
  await mkdir(mediaDir, { recursive: true });

  const componentPaths = new Set();
  let stalePages = 0;
  let lastCount = 0;

  for (let page = 1; page <= 60; page += 1) {
    const pageUrl = `${SOURCES.marketplace}?page=${page}`;
    const html = await fetchText(pageUrl);
    for (const match of html.matchAll(/\/marketplace\/components\/(?!category\/)([a-zA-Z0-9_-]+)\//g)) {
      componentPaths.add(`/marketplace/components/${match[1]}/`);
    }
    if (componentPaths.size === lastCount) stalePages += 1;
    else stalePages = 0;
    lastCount = componentPaths.size;
    if (stalePages >= 3) break;
    await sleep(120);
  }

  const manifest = {
    source: SOURCES.marketplace,
    collectedAt: new Date().toISOString(),
    note: "Public free Framer Marketplace component pages. Component modules and preview media are downloaded when directly exposed and under the local size cap.",
    maxAssetBytes: MAX_ASSET_BYTES,
    components: [],
    skippedDownloads: [],
    failedDownloads: [],
  };

  let index = 0;
  for (const componentPath of [...componentPaths].sort()) {
    index += 1;
    const url = absoluteUrl(componentPath, SOURCES.marketplace);
    const html = await fetchText(url);
    const title =
      cleanText(html.match(/<h1[^>]*>(.*?)<\/h1>/is)?.[1]) ||
      cleanText(html.match(/<title[^>]*>(.*?)<\/title>/is)?.[1]).replace("— Framer Marketplace", "");
    const slug = componentPath.split("/").filter(Boolean).pop();
    const urls = extractHrefUrls(html, url);
    const moduleUrls = unique(urls.filter((item) => item.includes("framer.com/m/")));
    const mediaUrls = unique(
      urls.filter((item) =>
        /y4pdgnepgswqffpt\.public\.blob\.vercel-storage\.com|framerusercontent\.com\/images/.test(item),
      ),
    ).slice(0, 8);
    const demoUrls = unique(
      urls.filter(
        (item) =>
          !item.includes("www.framer.com") &&
          !item.includes("framer.com/m/") &&
          !item.includes("blob.vercel-storage.com") &&
          !item.includes("framerusercontent.com") &&
          !item.includes("googletagmanager.com") &&
          !item.startsWith("mailto:"),
      ),
    );
    const relatedUrls = unique(
      urls.filter((item) => /framer\.university|frameruni\.link|framer\.link/.test(item)),
    );

    const item = {
      slug,
      title: title || slug,
      detailUrl: url,
      pricing: html.includes("Free") ? "Free" : "Unknown",
      moduleUrls,
      demoUrls,
      relatedUrls,
      mediaUrls,
      downloads: [],
    };

    for (let i = 0; i < moduleUrls.length; i += 1) {
      const downloaded = await downloadSmallAsset(moduleUrls[i], moduleDir, `${slug}-${i + 1}`, manifest);
      if (downloaded) item.downloads.push(downloaded);
    }
    for (let i = 0; i < mediaUrls.length; i += 1) {
      const downloaded = await downloadSmallAsset(mediaUrls[i], mediaDir, `${slug}-${i + 1}`, manifest);
      if (downloaded) item.downloads.push(downloaded);
    }

    manifest.components.push(item);
    if (index % 25 === 0) console.log(`Marketplace: ${index}/${componentPaths.size}`);
    await sleep(120);
  }

  await writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  return manifest;
}

async function collectUniversity() {
  const outDir = path.join(ROOT, "framer-university");
  const mediaDir = path.join(outDir, "media");
  await mkdir(mediaDir, { recursive: true });

  const searchIndexUrl =
    "https://framerusercontent.com/sites/7EdCgnXPOuwKPccz50c0Sg/searchIndex-npq01LfRhZc1.json";
  const searchIndex = await fetchJson(searchIndexUrl);
  const resourcePaths = Object.keys(searchIndex)
    .filter((key) => key.startsWith("/resources/") && key !== "/resources/featured")
    .sort();

  const manifest = {
    source: SOURCES.university,
    searchIndexUrl,
    collectedAt: new Date().toISOString(),
    note: "Public Framer University resource pages. Remix/demo URLs are preserved; preview media is downloaded when directly exposed and under the local size cap.",
    maxAssetBytes: MAX_ASSET_BYTES,
    resources: [],
    skippedDownloads: [],
    failedDownloads: [],
  };

  let index = 0;
  for (const resourcePath of resourcePaths) {
    index += 1;
    const url = absoluteUrl(resourcePath, SOURCES.university);
    const html = await fetchText(url);
    const entry = searchIndex[resourcePath] || {};
    const title =
      entry.title ||
      cleanText(html.match(/<h1[^>]*>(.*?)<\/h1>/is)?.[1]) ||
      resourcePath.split("/").pop();
    const urls = extractHrefUrls(html, url);
    const remixUrls = unique(
      urls.filter((item) => /framer\.link|frameruni\.link|framer\.com\/projects\/new/.test(item)),
    );
    const demoUrls = unique(
      urls.filter((item) => /learnframer\.site|framer\.website|\.framer\.app/.test(item)),
    );
    const mediaUrls = unique(urls.filter((item) => /framerusercontent\.com\/images/.test(item))).slice(0, 5);

    const item = {
      slug: resourcePath.split("/").pop(),
      title: cleanText(title),
      url,
      type: entry.p?.find((text) => /^(Component|Animation|Override|Resource)$/i.test(text)) || "Resource",
      remixUrls,
      demoUrls,
      codeBlocks: entry.codeblock || [],
      mediaUrls,
      downloads: [],
    };

    for (let i = 0; i < mediaUrls.length; i += 1) {
      const downloaded = await downloadSmallAsset(mediaUrls[i], mediaDir, `${item.slug}-${i + 1}`, manifest);
      if (downloaded) item.downloads.push(downloaded);
    }

    manifest.resources.push(item);
    if (index % 20 === 0) console.log(`Framer University: ${index}/${resourcePaths.length}`);
    await sleep(100);
  }

  await writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  return manifest;
}

async function collectHyperframer() {
  const outDir = path.join(ROOT, "hyperframer");
  const mediaDir = path.join(outDir, "media");
  await mkdir(mediaDir, { recursive: true });

  const manifest = {
    source: SOURCES.hyperframer,
    api: "https://www.hyperframer.com/wp-json/wp/v2/posts",
    collectedAt: new Date().toISOString(),
    note: "Public HyperFramer post metadata from WordPress API. Remix/demo URLs are preserved; preview media is downloaded when directly exposed and under the local size cap.",
    maxAssetBytes: MAX_ASSET_BYTES,
    resources: [],
    skippedDownloads: [],
    failedDownloads: [],
  };

  let totalPages = 1;
  for (let page = 1; page <= totalPages; page += 1) {
    const url = `${manifest.api}?per_page=100&page=${page}&_embed=wp:featuredmedia`;
    const response = await fetch(url, { headers: { "user-agent": UA } });
    if (!response.ok) break;
    totalPages = Number(response.headers.get("x-wp-totalpages") || totalPages);
    const posts = await response.json();
    for (const post of posts) {
      const meta = post.meta || {};
      const embeddedMedia =
        post._embedded?.["wp:featuredmedia"]?.[0]?.source_url ||
        post._embedded?.["wp:featuredmedia"]?.[0]?.media_details?.sizes?.full?.source_url ||
        "";
      const mediaUrls = unique([
        embeddedMedia,
        meta["wpcf-featured-video"],
        meta["wpcf-favicon"],
      ]).filter(Boolean);
      const item = {
        slug: post.slug,
        title: cleanText(post.title?.rendered || post.slug),
        url: post.link,
        demoUrl: meta["wpcf-url"] || "",
        remixUrl: meta["wpcf-remix-url"] || "",
        youtubeUrl: meta["wpcf-youtube-link"] || "",
        featuredVideo: meta["wpcf-featured-video"] || "",
        favicon: meta["wpcf-favicon"] || "",
        mediaUrls,
        downloads: [],
      };

      for (let i = 0; i < mediaUrls.length; i += 1) {
        const downloaded = await downloadSmallAsset(mediaUrls[i], mediaDir, `${post.slug}-${i + 1}`, manifest);
        if (downloaded) item.downloads.push(downloaded);
      }

      manifest.resources.push(item);
    }
    console.log(`HyperFramer: page ${page}/${totalPages}, total ${manifest.resources.length}`);
    await sleep(160);
  }

  await writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  return manifest;
}

function compactSummary(marketplace, university, hyperframer) {
  const countDownloads = (items) => items.reduce((sum, item) => sum + (item.downloads?.length || 0), 0);
  const downloadBytes = (items) =>
    items.reduce(
      (sum, item) => sum + (item.downloads || []).reduce((inner, download) => inner + (download.bytes || 0), 0),
      0,
    );
  const summary = {
    collectedAt: new Date().toISOString(),
    sourceUrls: SOURCES,
    maxAssetBytes: MAX_ASSET_BYTES,
    totals: {
      marketplaceComponents: marketplace.components.length,
      marketplaceDownloads: countDownloads(marketplace.components),
      framerUniversityResources: university.resources.length,
      framerUniversityDownloads: countDownloads(university.resources),
      hyperframerResources: hyperframer.resources.length,
      hyperframerDownloads: countDownloads(hyperframer.resources),
      downloadedBytes:
        downloadBytes(marketplace.components) +
        downloadBytes(university.resources) +
        downloadBytes(hyperframer.resources),
      skippedDownloads:
        marketplace.skippedDownloads.length +
        university.skippedDownloads.length +
        hyperframer.skippedDownloads.length,
      failedDownloads:
        marketplace.failedDownloads.length +
        university.failedDownloads.length +
        hyperframer.failedDownloads.length,
    },
    manifests: {
      marketplace: "framer-marketplace/manifest.json",
      university: "framer-university/manifest.json",
      hyperframer: "hyperframer/manifest.json",
    },
  };
  return summary;
}

await mkdir(ROOT, { recursive: true });

const marketplace = await collectMarketplace();
const university = await collectUniversity();
const hyperframer = await collectHyperframer();
const summary = compactSummary(marketplace, university, hyperframer);

await writeFile(path.join(ROOT, "summary.json"), JSON.stringify(summary, null, 2));
await writeFile(
  path.join(ROOT, "README.md"),
  [
    "# Framer Free Asset Cache",
    "",
    "This folder contains public/free Framer asset metadata and directly downloadable preview/module files collected from:",
    `- ${SOURCES.marketplace}`,
    `- ${SOURCES.university}`,
    `- ${SOURCES.hyperframer}`,
    "",
    "The manifests preserve remix/demo/download URLs. Large files above the size cap are recorded as skipped instead of silently filling the project with huge videos.",
    "",
    "See `summary.json` and each source manifest for the full inventory.",
    "",
  ].join("\n"),
);

console.log(JSON.stringify(summary, null, 2));
