import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  const baseDir = path.join(process.cwd(), "_answers");

  let v1Count = 0;
  let v2Count = 0;

  try {
    const v1Dir = path.join(baseDir, "v1");
    if (fs.existsSync(v1Dir)) {
      v1Count = fs
        .readdirSync(v1Dir)
        .filter((f) => {
          const fullPath = path.join(v1Dir, f);
          return fs.statSync(fullPath).isDirectory() && f.startsWith("question-");
        }).length;
    }
  } catch {
    v1Count = 0;
  }

  try {
    const v2Dir = path.join(baseDir, "v2");
    if (fs.existsSync(v2Dir)) {
      v2Count = fs
        .readdirSync(v2Dir)
        .filter((f) => {
          const fullPath = path.join(v2Dir, f);
          return fs.statSync(fullPath).isDirectory();
        }).length;
    }
  } catch {
    v2Count = 0;
  }

  return NextResponse.json({ v1: v1Count, v2: v2Count });
}
