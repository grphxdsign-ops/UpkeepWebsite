import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve("assets/framer-free");
const MODULE_DIR = path.join(ROOT, "framer-marketplace", "modules");
const MAX_BYTES = 2 * 1024 * 1024;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) UpkeepFramerModuleDownloader/1.0";

const catalog = JSON.parse(
  await import("node:fs/promises").then(({ readFile }) =>
    readFile(path.join(ROOT, "framer-marketplace", "catalog.json"), "utf8"),
  ),
);

function safeName(value = "module") {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100) || "module";
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
        results[index] = { ...items[index], ok: false, reason: error.message };
      }
    }
  });
  await Promise.all(workers);
  return results;
}

await mkdir(MODULE_DIR, { recursive: true });

const jobs = [];
for (const component of catalog.components) {
  for (const [index, url] of (component.moduleUrls || []).entries()) {
    jobs.push({
      slug: component.slug,
      title: component.title,
      url: String(url).replace(/\/$/, ""),
      file: `${safeName(component.slug)}-${index + 1}.js`,
    });
  }
}

const results = await mapLimit(jobs, 24, async (job, index) => {
  const response = await fetch(job.url, { headers: { "user-agent": UA } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);

  const chunks = [];
  let total = 0;
  for await (const chunk of response.body) {
    total += chunk.length;
    if (total > MAX_BYTES) throw new Error(`module exceeded ${MAX_BYTES} bytes`);
    chunks.push(chunk);
  }

  const filePath = path.join(MODULE_DIR, job.file);
  await writeFile(filePath, Buffer.concat(chunks));
  if ((index + 1) % 250 === 0) console.log(`Downloaded modules ${index + 1}/${jobs.length}`);
  return {
    ...job,
    ok: true,
    bytes: total,
    file: path.relative(ROOT, filePath).replaceAll("\\", "/"),
  };
});

const manifest = {
  generatedAt: new Date().toISOString(),
  totalModuleUrls: jobs.length,
  downloaded: results.filter((item) => item.ok).length,
  failed: results.filter((item) => !item.ok).length,
  maxBytes: MAX_BYTES,
  results,
};

await writeFile(path.join(ROOT, "framer-marketplace", "module-downloads.json"), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({
  totalModuleUrls: manifest.totalModuleUrls,
  downloaded: manifest.downloaded,
  failed: manifest.failed,
}, null, 2));
