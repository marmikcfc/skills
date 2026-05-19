import { copyFile, mkdir, stat } from "node:fs/promises";
import { basename, join } from "node:path";

export async function registerManimAsset({ srcMp4, hyperframesRoot }) {
  try { await stat(srcMp4); }
  catch { throw new Error(`source not found: ${srcMp4}`); }
  const dstDir = join(hyperframesRoot, "public", "manim-clips");
  await mkdir(dstDir, { recursive: true });
  const dst = join(dstDir, basename(srcMp4));
  await copyFile(srcMp4, dst);
  return dst;
}
