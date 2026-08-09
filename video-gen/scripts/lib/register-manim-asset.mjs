import { copyFile, mkdir, stat } from "node:fs/promises";
import { basename, join } from "node:path";

export async function registerManimAsset({ srcMp4, hyperframesRoot }) {
  try { await stat(srcMp4); }
  catch { throw new Error(`source not found: ${srcMp4}`); }
  // Verified against `hyperframes init`: media lives in assets/, not public/.
  const dstDir = join(hyperframesRoot, "assets", "manim");
  await mkdir(dstDir, { recursive: true });
  const dst = join(dstDir, basename(srcMp4));
  await copyFile(srcMp4, dst);
  return dst;
}
