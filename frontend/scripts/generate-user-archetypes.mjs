import { Buffer } from "node:buffer";
import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const outputDir = join(rootDir, "public", "archetypes");

const archetypes = [
  { key: "ember_knight", prompt: "boy, fiery knight apprentice, bright red-orange armor accents" },
  { key: "nova_warden", prompt: "boy, futuristic guardian, cyan visor, sci-fi hero portrait" },
  { key: "thorn_ranger", prompt: "boy, forest ranger hero, green cloak, confident expression" },
  { key: "frost_sentinel", prompt: "boy, icy sentinel warrior, silver-blue armor, calm focused look" },
  { key: "iron_vanguard", prompt: "boy, tank vanguard hero, steel armor, bold determined face" },
  { key: "luna_blade", prompt: "girl, moonlight duelist, elegant armor, glowing blade motif" },
  { key: "aurora_sage", prompt: "girl, mystical sage mage, aurora aura, wise confident expression" },
  { key: "ivy_striker", prompt: "girl, agile rogue striker, emerald outfit, playful fierce expression" },
  { key: "seraph_huntress", prompt: "girl, elite huntress, golden-white gear, sharp focused gaze" },
  { key: "dawn_oracle", prompt: "girl, sunrise oracle, radiant light motifs, calm strong pose" }
];

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function fetchImage(prompt, seed) {
  const fetchFn = globalThis.fetch;
  if (!fetchFn) {
    throw new Error("fetch is not available in this Node runtime");
  }
  const style =
    "stylized cartoon game avatar, head and shoulders portrait, clean background, premium character art, no text, no watermark";
  const fullPrompt = `${prompt}, ${style}`;
  const encoded = encodeURIComponent(fullPrompt);
  const url = `https://image.pollinations.ai/prompt/${encoded}?model=flux&width=768&height=768&seed=${seed}&nologo=true&safe=true`;
  const response = await fetchFn(url);
  if (!response.ok) throw new Error(`Image request failed (${response.status})`);
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("image")) throw new Error(`Expected image response, got ${contentType || "unknown"}`);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function main() {
  await mkdir(outputDir, { recursive: true });
  for (let i = 0; i < archetypes.length; i += 1) {
    const archetype = archetypes[i];
    const outPath = join(outputDir, `${archetype.key}.png`);
    if (await fileExists(outPath)) {
      process.stdout.write(`Skipped ${i + 1}/10: ${archetype.key} (already exists)\n`);
      continue;
    }

    let lastError = "";
    let saved = false;
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      try {
        const bytes = await fetchImage(archetype.prompt, 9200 + i * 10 + attempt);
        await writeFile(outPath, bytes);
        process.stdout.write(`Generated ${i + 1}/10: ${archetype.key}\n`);
        saved = true;
        break;
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        process.stdout.write(`Retry ${attempt}/4 failed for ${archetype.key}: ${lastError}\n`);
      }
    }
    if (!saved) {
      throw new Error(`Failed generating ${archetype.key}: ${lastError}`);
    }
  }
  process.stdout.write(`Saved archetype avatars to ${outputDir}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
