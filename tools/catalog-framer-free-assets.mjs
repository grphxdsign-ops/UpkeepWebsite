import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve("assets/framer-free");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) UpkeepFramerCatalog/1.0";

const SOURCES = {
  marketplace: "https://www.framer.com/marketplace/components/",
  university: "https://framer.university/resources",
  hyperframer: "https://www.hyperframer.com/",
};

function cleanText(value = "") {
  return String(value)
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8217;|’/g, "'")
    .replace(/&#8211;|–/g, "-")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
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

function extractUrls(html, base) {
  const hrefs = [...html.matchAll(/href=["']([^"']+)["']/gi)].map((match) =>
    absoluteUrl(match[1], base),
  );
  const srcs = [...html.matchAll(/src=["']([^"']+)["']/gi)].map((match) =>
    absoluteUrl(match[1], base),
  );
  const raw = [...html.matchAll(/https?:\\?\/\\?\/[^"'<>\s)]+/gi)].map((match) =>
    absoluteUrl(match[0], base),
  );
  return unique([...hrefs, ...srcs, ...raw]);
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { "user-agent": UA } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.text();
}

async function fetchJsonWithHeaders(url) {
  const response = await fetch(url, { headers: { "user-agent": UA } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return { json: await response.json(), headers: response.headers };
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      try {
        results[index] = await worker(items[index], index);
      } catch (error) {
        results[index] = { error: error.message, input: items[index] };
      }
    }
  });
  await Promise.all(workers);
  return results;
}

async function catalogMarketplace() {
  const outDir = path.join(ROOT, "framer-marketplace");
  await mkdir(outDir, { recursive: true });

  const candidatePages = [1, 2, 3, 5, 10, 20, 40, 80, 100, 120, 140, 150, 160, 180, 200];
  const componentPaths = new Set();
  const pageCounts = [];

  for (const page of candidatePages) {
    const url = `${SOURCES.marketplace}?page=${page}`;
    const html = await fetchText(url);
    const pageLinks = [
      ...html.matchAll(/\/marketplace\/components\/(?!category\/)([a-zA-Z0-9_-]+)\//g),
    ].map((match) => `/marketplace/components/${match[1]}/`);
    pageLinks.forEach((item) => componentPaths.add(item));
    pageCounts.push({ page, pageLinks: new Set(pageLinks).size, cumulativeUnique: componentPaths.size });
    console.log(`Marketplace list page ${page}: ${componentPaths.size} unique`);
  }

  const paths = [...componentPaths].sort();
  const components = await mapLimit(paths, 16, async (componentPath, index) => {
    const url = absoluteUrl(componentPath, SOURCES.marketplace);
    const html = await fetchText(url);
    const urls = extractUrls(html, url);
    const slug = componentPath.split("/").filter(Boolean).pop();
    const title =
      cleanText(html.match(/<h1[^>]*>(.*?)<\/h1>/is)?.[1]) ||
      cleanText(html.match(/<title[^>]*>(.*?)<\/title>/is)?.[1])
        .replace("— Framer Marketplace", "")
        .replace("- Framer Marketplace", "") ||
      slug;

    if ((index + 1) % 100 === 0) console.log(`Marketplace detail ${index + 1}/${paths.length}`);
    return {
      slug,
      title,
      detailUrl: url,
      pricing: html.includes("Free") ? "Free" : "Unknown",
      moduleUrls: unique(urls.filter((item) => item.includes("framer.com/m/"))),
      duplicateUrls: unique(urls.filter((item) => item.includes("framer.com/projects/new"))),
      demoUrls: unique(
        urls.filter(
          (item) =>
            !item.includes("framer.com/marketplace") &&
            !item.includes("framer.com/m/") &&
            !item.includes("framerusercontent.com") &&
            !item.includes("blob.vercel-storage.com") &&
            /\.(site|app|website)\//.test(`${item}/`),
        ),
      ),
      resourceUrls: unique(
        urls.filter((item) => /framer\.university|frameruni\.link|framer\.link|learnframer\.site/.test(item)),
      ),
      mediaUrls: unique(
        urls.filter((item) =>
          /y4pdgnepgswqffpt\.public\.blob\.vercel-storage\.com|framerusercontent\.com\/images/.test(item),
        ),
      ),
    };
  });

  const manifest = {
    source: SOURCES.marketplace,
    collectedAt: new Date().toISOString(),
    listPageCounts: pageCounts,
    note: "Complete public catalog pass from cumulative Marketplace component pages. Actual Framer import is preserved as module/resource URLs when exposed by the public page.",
    components,
  };

  await writeFile(path.join(outDir, "catalog.json"), JSON.stringify(manifest, null, 2));
  return manifest;
}

async function catalogUniversity() {
  const outDir = path.join(ROOT, "framer-university");
  await mkdir(outDir, { recursive: true });

  const searchIndexUrl =
    "https://framerusercontent.com/sites/7EdCgnXPOuwKPccz50c0Sg/searchIndex-npq01LfRhZc1.json";
  const { json: searchIndex } = await fetchJsonWithHeaders(searchIndexUrl);
  const paths = Object.keys(searchIndex)
    .filter((key) => key.startsWith("/resources/") && key !== "/resources/featured")
    .sort();

  const resources = await mapLimit(paths, 16, async (resourcePath, index) => {
    const url = absoluteUrl(resourcePath, SOURCES.university);
    const html = await fetchText(url);
    const urls = extractUrls(html, url);
    const entry = searchIndex[resourcePath] || {};
    if ((index + 1) % 100 === 0) console.log(`Framer University detail ${index + 1}/${paths.length}`);
    return {
      slug: resourcePath.split("/").pop(),
      title: cleanText(entry.title || html.match(/<title[^>]*>(.*?)<\/title>/is)?.[1] || resourcePath),
      url,
      type: entry.p?.find((text) => /^(Component|Animation|Override|Resource)$/i.test(text)) || "Resource",
      remixUrls: unique(
        urls.filter((item) => /framer\.link|frameruni\.link|framer\.com\/projects\/new/.test(item)),
      ),
      demoUrls: unique(urls.filter((item) => /learnframer\.site|framer\.website|\.framer\.app/.test(item))),
      mediaUrls: unique(urls.filter((item) => /framerusercontent\.com\/images/.test(item))),
      codeBlocks: entry.codeblock || [],
    };
  });

  const manifest = {
    source: SOURCES.university,
    searchIndexUrl,
    collectedAt: new Date().toISOString(),
    note: "Complete public catalog pass from Framer University's search index plus each resource page.",
    resources,
  };

  await writeFile(path.join(outDir, "catalog.json"), JSON.stringify(manifest, null, 2));
  return manifest;
}

async function catalogHyperframer() {
  const outDir = path.join(ROOT, "hyperframer");
  await mkdir(outDir, { recursive: true });

  const api = "https://www.hyperframer.com/wp-json/wp/v2/posts";
  const resources = [];
  let totalPages = 1;

  for (let page = 1; page <= totalPages; page += 1) {
    const { json: posts, headers } = await fetchJsonWithHeaders(
      `${api}?per_page=100&page=${page}&_embed=wp:featuredmedia`,
    );
    totalPages = Number(headers.get("x-wp-totalpages") || totalPages);
    for (const post of posts) {
      const meta = post.meta || {};
      const featuredMedia =
        post._embedded?.["wp:featuredmedia"]?.[0]?.source_url ||
        post._embedded?.["wp:featuredmedia"]?.[0]?.media_details?.sizes?.full?.source_url ||
        "";
      resources.push({
        slug: post.slug,
        title: cleanText(post.title?.rendered || post.slug),
        url: post.link,
        demoUrl: meta["wpcf-url"] || "",
        remixUrl: meta["wpcf-remix-url"] || "",
        youtubeUrl: meta["wpcf-youtube-link"] || "",
        featuredMedia,
        featuredVideo: meta["wpcf-featured-video"] || "",
        favicon: meta["wpcf-favicon"] || "",
      });
    }
    console.log(`HyperFramer page ${page}/${totalPages}: ${resources.length}`);
  }

  const manifest = {
    source: SOURCES.hyperframer,
    api,
    collectedAt: new Date().toISOString(),
    note: "Complete public catalog pass from HyperFramer's WordPress API.",
    resources,
  };

  await writeFile(path.join(outDir, "catalog.json"), JSON.stringify(manifest, null, 2));
  return manifest;
}

await mkdir(ROOT, { recursive: true });

const marketplace = await catalogMarketplace();
const university = await catalogUniversity();
const hyperframer = await catalogHyperframer();

const summary = {
  collectedAt: new Date().toISOString(),
  sourceUrls: SOURCES,
  totals: {
    marketplaceComponents: marketplace.components.length,
    marketplaceModuleUrls: marketplace.components.reduce((sum, item) => sum + item.moduleUrls.length, 0),
    marketplaceMediaUrls: marketplace.components.reduce((sum, item) => sum + item.mediaUrls.length, 0),
    framerUniversityResources: university.resources.length,
    framerUniversityRemixUrls: university.resources.reduce((sum, item) => sum + item.remixUrls.length, 0),
    framerUniversityMediaUrls: university.resources.reduce((sum, item) => sum + item.mediaUrls.length, 0),
    hyperframerResources: hyperframer.resources.length,
    hyperframerRemixUrls: hyperframer.resources.filter((item) => item.remixUrl).length,
    hyperframerDemoUrls: hyperframer.resources.filter((item) => item.demoUrl).length,
  },
  catalogs: {
    marketplace: "framer-marketplace/catalog.json",
    university: "framer-university/catalog.json",
    hyperframer: "hyperframer/catalog.json",
  },
  existingDownloadsNote:
    "The first media mirror pass downloaded preview files into framer-marketplace/media before timing out. The catalogs preserve all exposed URLs for complete selection and follow-up downloading.",
};

await writeFile(path.join(ROOT, "summary.json"), JSON.stringify(summary, null, 2));
await writeFile(
  path.join(ROOT, "README.md"),
  [
    "# Framer Free Asset Catalog",
    "",
    "Public/free Framer assets and resource links collected for Upkeep design work.",
    "",
    "Sources:",
    `- ${SOURCES.marketplace}`,
    `- ${SOURCES.university}`,
    `- ${SOURCES.hyperframer}`,
    "",
    "Use `summary.json` for counts, and each source `catalog.json` for the usable URLs.",
    "The Marketplace media folder contains preview assets downloaded during the first mirror pass.",
    "",
  ].join("\n"),
);

console.log(JSON.stringify(summary, null, 2));
