// Build steps shared by tools/build.ts and per-module build.ts files.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import vm from "node:vm";
import { spawnSync } from "node:child_process";
import { minify_sync } from "terser";
export const root = path.resolve(import.meta.dir, "..");
// With --check nothing is written; stale products fail the run instead.
export const check = process.argv.includes("--check");
export function run(args: string[]): void {
    const result = spawnSync(process.execPath, args, { stdio: "inherit" });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error("Failed: bun " + args.join(" "));
}
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
// Type-checks and compiles a module's src/*.ts; returns the JS by script name.
export function compile(dir: string): Map<string, string> {
    const compiled = fs.mkdtempSync(
        path.join(os.tmpdir(), path.basename(dir) + "-ts-"),
    );
    try {
        run([
            path.join(root, "node_modules/typescript/bin/tsc"),
            "--project",
            path.join(dir, "tsconfig.json"),
            "--outDir",
            compiled,
        ]);
        const out = path.join(compiled, "src");
        return new Map(
            fs
                .readdirSync(out)
                .sort()
                .map((file) => [
                    path.basename(file, ".js"),
                    fs.readFileSync(path.join(out, file), "utf8"),
                ]),
        );
    } finally {
        fs.rmSync(compiled, { recursive: true, force: true });
    }
}
// Minifies one script into dist/scripts/<module>/<name>.js.
export function emitScript(module: string, name: string, source: string) {
    const { code } = minify_sync(source, {
        ecma: 2022,
        compress: { passes: 2 },
        format: { comments: /copyright|@license|@preserve|^!/i },
    });
    if (!code) throw new Error("Empty script: " + module + "/" + name);
    new vm.Script(code, { filename: name + ".js" });
    output(path.join("scripts", module, name + ".js"), code + "\n");
}
// Copies the module's single .sgmodule file into dist/modules.
export function emitModule(dir: string): void {
    const files = fs
        .readdirSync(dir)
        .filter((file) => file.endsWith(".sgmodule"));
    if (files.length !== 1) throw new Error("Expected one .sgmodule in " + dir);
    output(
        path.join("modules", files[0]),
        fs.readFileSync(path.join(dir, files[0]), "utf8"),
    );
}
