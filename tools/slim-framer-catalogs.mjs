import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve("assets/framer-free");

const readJson = async (file) => JSON.parse(await readFile(path.join(ROOT, file), "utf8"));

function uniq(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function pickMedia(values, limit = 8) {
  return uniq(values).slice(0, limit);
}

function hasAny(value, terms) {
  const lower = `${value}`.toLowerCase();
  return terms.some((term) => lower.includes(term));
}

const designTerms = [
  "card",
  "stack",
  "scroll",
  "carousel",
  "marquee",
  "hover",
  "reveal",
  "gradient",
  "button",
  "navigation",
  "tabs",
  "cursor",
  "particles",
  "background",
  "drawer",
  "book",
  "3d",
  "tilt",
  "trail",
  "text",
  "mask",
  "gallery",
  "preloader",
];

const marketplace = await readJson("framer-marketplace/catalog.json");
const university = await readJson("framer-university/catalog.json");
const hyperframer = await readJson("hyperframer/catalog.json");

const marketplaceItems = marketplace.components.map((item) => ({
  slug: item.slug,
  title: item.title,
  detailUrl: item.detailUrl,
  moduleUrls: uniq(item.moduleUrls),
  duplicateUrls: uniq(item.duplicateUrls),
  demoUrls: uniq(item.demoUrls),
  resourceUrls: uniq(item.resourceUrls),
  mediaUrls: pickMedia(item.mediaUrls),
}));

const universityItems = university.resources.map((item) => ({
  slug: item.slug,
  title: item.title,
  url: item.url,
  type: item.type,
  remixUrls: uniq(item.remixUrls),
  demoUrls: uniq(item.demoUrls),
  mediaUrls: pickMedia(item.mediaUrls, 5),
  codeBlockCount: item.codeBlocks?.length || 0,
}));

const hyperframerItems = hyperframer.resources.map((item) => ({
  slug: item.slug,
  title: item.title,
  url: item.url,
  demoUrl: item.demoUrl,
  remixUrl: item.remixUrl,
  youtubeUrl: item.youtubeUrl,
  featuredMedia: item.featuredMedia,
  featuredVideo: item.featuredVideo,
}));

const designCandidates = {
  marketplace: marketplaceItems
    .filter((item) => hasAny(`${item.slug} ${item.title}`, designTerms))
    .slice(0, 400),
  university: universityItems
    .filter((item) => hasAny(`${item.slug} ${item.title}`, designTerms))
    .slice(0, 250),
  hyperframer: hyperframerItems
    .filter((item) => hasAny(`${item.slug} ${item.title}`, designTerms))
    .slice(0, 350),
};

const slim = {
  generatedAt: new Date().toISOString(),
  totals: {
    marketplaceComponents: marketplaceItems.length,
    marketplaceModuleUrls: marketplaceItems.reduce((sum, item) => sum + item.moduleUrls.length, 0),
    marketplaceDuplicateUrls: marketplaceItems.reduce((sum, item) => sum + item.duplicateUrls.length, 0),
    framerUniversityResources: universityItems.length,
    framerUniversityRemixUrls: universityItems.reduce((sum, item) => sum + item.remixUrls.length, 0),
    hyperframerResources: hyperframerItems.length,
    hyperframerRemixUrls: hyperframerItems.filter((item) => item.remixUrl).length,
    hyperframerDemoUrls: hyperframerItems.filter((item) => item.demoUrl).length,
  },
  files: {
    fullMarketplaceCatalog: "framer-marketplace/catalog.json",
    fullFramerUniversityCatalog: "framer-university/catalog.json",
    fullHyperframerCatalog: "hyperframer/catalog.json",
  },
  designCandidates,
  marketplace: marketplaceItems,
  framerUniversity: universityItems,
  hyperframer: hyperframerItems,
};

await writeFile(path.join(ROOT, "slim-index.json"), JSON.stringify(slim, null, 2));

console.log(JSON.stringify(slim.totals, null, 2));
