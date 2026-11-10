import type * as Fs from "node:fs";
const fs: typeof Fs = require("node:fs");
const path: typeof import("node:path") = require("node:path");
const os: typeof import("node:os") = require("node:os");
const vm: typeof import("node:vm") = require("node:vm");
const {
    spawnSync,
}: typeof import("node:child_process") = require("node:child_process");
const { minify_sync }: typeof import("terser") = require("terser");
const root = path.resolve(__dirname, "../..");
const compiled = fs.mkdtempSync(path.join(os.tmpdir(), "coupang-ts-"));
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
            path.join(__dirname, "tsconfig.json"),
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
        output(path.join("scripts/coupang", name + ".js"), code + "\n");
    }
    output(
        "modules/coupang-adblock.sgmodule",
        fs.readFileSync(
            path.join(__dirname, "coupang-adblock.sgmodule"),
            "utf8",
        ),
    );
} finally {
    fs.rmSync(compiled, { recursive: true, force: true });
}
