import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = resolve(projectRoot, "dist");

if (!outputDir.startsWith(`${projectRoot}${sep}`)) {
  throw new Error("Refusing to write outside the project directory.");
}

rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });

for (const file of ["index.html", "styles.css", "script.js", "dynamic-title.js"]) {
  cpSync(join(projectRoot, file), join(outputDir, file));
}

cpSync(join(projectRoot, "assets"), join(outputDir, "assets"), { recursive: true });
writeFileSync(
  join(outputDir, "_routes.json"),
  JSON.stringify({ version: 1, include: ["/api/*"], exclude: [] }, null, 2),
);
console.log(`Static site prepared in ${outputDir}`);
