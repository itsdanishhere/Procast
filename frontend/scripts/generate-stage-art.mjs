import { Buffer } from "node:buffer";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const stagesPath = join(rootDir, "lib", "world-stages.ts");
const outputDir = join(rootDir, "public", "progression", "stages");

const style =
  "cartoon fantasy game card art, colorful, soft cinematic lighting, highly detailed, clean composition, no text, no watermark";

function parseStages(content) {
  const blocks = [...content.matchAll(/\{\s*code:\s*"([^"]+)"[\s\S]*?name:\s*"([^"]+)"[\s\S]*?description:\s*"([^"]+)"/g)];
  return blocks.map((match, index) => ({
    index: index + 1,
    code: match[1],
    name: match[2],
    description: match[3]
  }));
}

function buildPrompt(stage) {
  return `${stage.name}, ${stage.description}, progression level ${stage.index} of 50, ${style}`;
}

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
  const encoded = encodeURIComponent(prompt);
  const url = `https://image.pollinations.ai/prompt/${encoded}?model=flux&width=896&height=392&seed=${seed}&nologo=true&safe=true`;
  const response = await fetchFn(url);
  if (!response.ok) {
    throw new Error(`Image request failed (${response.status})`);
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("image")) {
    throw new Error(`Expected image response, got ${contentType || "unknown"}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function main() {
  await mkdir(outputDir, { recursive: true });
  const fileContent = await readFile(stagesPath, "utf8");
  const stages = parseStages(fileContent);

  if (stages.length !== 50) {
    throw new Error(`Expected 50 stages, found ${stages.length}`);
  }

  for (const stage of stages) {
    const prompt = buildPrompt(stage);
    const seed = 8000 + stage.index;
    const outputPath = join(outputDir, `${stage.code.toLowerCase()}.png`);
    if (await fileExists(outputPath)) {
      process.stdout.write(`Skipped ${stage.index}/50: ${stage.code} (already exists)\n`);
      continue;
    }

    let lastError = "";
    let saved = false;
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      try {
        const imageBytes = await fetchImage(prompt, seed + attempt - 1);
        await writeFile(outputPath, imageBytes);
        process.stdout.write(`Generated ${stage.index}/50: ${stage.code}\n`);
        saved = true;
        break;
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        process.stdout.write(`Retry ${attempt}/4 failed for ${stage.code}: ${lastError}\n`);
      }
    }

    if (!saved) {
      throw new Error(`Failed to generate ${stage.code}: ${lastError}`);
    }
  }

  process.stdout.write(`Saved 50 stage images to ${outputDir}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
