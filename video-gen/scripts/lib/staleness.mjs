import { stat } from "node:fs/promises";

export async function isStale(targetPath, sourcePath) {
  let srcStat;
  try { srcStat = await stat(sourcePath); }
  catch (e) { throw new Error(`source not found: ${sourcePath}`); }
  let tgtStat;
  try { tgtStat = await stat(targetPath); }
  catch (e) { return true; }
  return srcStat.mtimeMs > tgtStat.mtimeMs;
}
