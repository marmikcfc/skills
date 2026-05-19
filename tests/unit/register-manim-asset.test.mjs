import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { registerManimAsset } from "../../scripts/lib/register-manim-asset.mjs";

test("copies manim MP4 into hyperframes/public/manim-clips/", async () => {
  const d = await mkdtemp(join(tmpdir(), "rma-"));
  try {
    const srcDir = join(d, "manim-clips");
    await mkdir(srcDir, { recursive: true });
    const src = join(srcDir, "03-metaphor.mp4");
    await writeFile(src, "video-bytes");
    const hyperRoot = join(d, "hyperframes");
    await mkdir(join(hyperRoot, "public"), { recursive: true });
    const dstPath = await registerManimAsset({ srcMp4: src, hyperframesRoot: hyperRoot });
    assert.equal(dstPath, join(hyperRoot, "public", "manim-clips", "03-metaphor.mp4"));
    const copied = await readFile(dstPath, "utf8");
    assert.equal(copied, "video-bytes");
  } finally { await rm(d, { recursive: true }); }
});

test("creates manim-clips dir if missing", async () => {
  const d = await mkdtemp(join(tmpdir(), "rma-"));
  try {
    const src = join(d, "scene.mp4");
    await writeFile(src, "x");
    await mkdir(join(d, "hyperframes", "public"), { recursive: true });
    const dst = await registerManimAsset({ srcMp4: src, hyperframesRoot: join(d, "hyperframes") });
    assert.match(dst, /manim-clips\/scene\.mp4$/);
  } finally { await rm(d, { recursive: true }); }
});

test("missing source throws", async () => {
  const d = await mkdtemp(join(tmpdir(), "rma-"));
  try {
    await mkdir(join(d, "hyperframes", "public"), { recursive: true });
    await assert.rejects(
      () => registerManimAsset({ srcMp4: join(d, "missing.mp4"), hyperframesRoot: join(d, "hyperframes") }),
      /source/i,
    );
  } finally { await rm(d, { recursive: true }); }
});
