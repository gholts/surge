import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import vm from "node:vm";
import { spawnSync } from "node:child_process";
import { minify_sync } from "terser";
const root = path.resolve(import.meta.dir, "../..");
const compiled = fs.mkdtempSync(path.join(os.tmpdir(), "naver-map-ts-"));
const check = process.argv.includes("--check");
function output(relative: string, contents: string): void {
    const file = path.join(root, "dist", relative);
    if (check) {
        if (
            !fs.existsSync(file) ||
            fs.readFileSync(file, "utf8") !== contents
        ) {
            console.error("STALE: " + relative);
            process.exitCode = 1;
        }
    } else {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, contents);
    }
}
try {
    const result = spawnSync(
        process.execPath,
        [
            path.join(root, "node_modules/typescript/bin/tsc"),
            "--project",
            path.join(import.meta.dir, "tsconfig.json"),
            "--outDir",
            compiled,
        ],
        { stdio: "inherit" },
    );
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error("TypeScript compilation failed");
    for (const name of ["request", "response"]) {
        const source = fs.readFileSync(
            path.join(compiled, "src", name + ".js"),
            "utf8",
        );
        const { code } = minify_sync("(() => {\n" + source + "\n})();", {
            ecma: 2022,
            compress: { passes: 2 },
        });
        if (!code) throw new Error("Empty script: " + name);
        new vm.Script(code, { filename: name + ".js" });
        output(path.join("scripts/naver-map", name + ".js"), code + "\n");
    }
    output(
        "modules/naver-map-adblock.sgmodule",
        fs.readFileSync(
            path.join(import.meta.dir, "naver-map-adblock.sgmodule"),
            "utf8",
        ),
    );
} finally {
    fs.rmSync(compiled, { recursive: true, force: true });
}
