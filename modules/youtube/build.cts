import type * as Fs from "node:fs";
const fs: typeof Fs = require("node:fs");
const path: typeof import("node:path") = require("node:path");
const vm: typeof import("node:vm") = require("node:vm");
const os: typeof import("node:os") = require("node:os");
const { createHash }: typeof import("node:crypto") = require("node:crypto");
const { minify_sync }: typeof import("terser") = require("terser");
const {
    spawnSync,
}: typeof import("node:child_process") = require("node:child_process");
const dir = __dirname;
const root = path.resolve(dir, "../..");
const compiled = fs.mkdtempSync(path.join(os.tmpdir(), "youtube-ts-"));
const sources = new Map<string, string>();
try {
    const result = spawnSync(
        process.execPath,
        [
            path.join(root, "node_modules/typescript/bin/tsc"),
            "--project",
            path.join(dir, "tsconfig.json"),
            "--outDir",
            compiled,
        ],
        { stdio: "inherit" },
    );
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error("TypeScript compilation failed");
    for (const file of fs.readdirSync(path.join(compiled, "src")))
        sources.set(
            path.basename(file, ".js"),
            fs
                .readFileSync(path.join(compiled, "src", file), "utf8")
                .replace(/^"use strict";\n/, "")
                .trim(),
        );
} finally {
    fs.rmSync(compiled, { recursive: true, force: true });
}
function read(name: string) {
    const contents = sources.get(name);
    if (contents === undefined) throw new Error("Missing source: " + name);
    return contents;
}
const schema = vm.runInNewContext(read("schema") + "\nschema;") as Schema;
const common = ["storage", "bytes", "wire", "integer"];
const controls = ["wire-path", "on-the-go", "on-the-go-resources"];
const library = [
    "quality",
    "ai",
    ...controls,
    "content",
    "api-features",
    "watch",
    "codec",
];
type Role = "request" | "response" | "key" | "ump";
const roles: Record<
    Role,
    { parts: string[]; roots?: MessageType[]; entry: string }
> = {
    request: {
        entry: "requestMain",
        parts: [
            ...common,
            "options",
            "platform",
            "recovery",
            "wire-path",
            "base64-decode",
            "quality-record",
            "request-quality",
            "request-entry",
        ],
    },
    response: {
        entry: "apiMain",
        parts: [
            ...common,
            "options",
            "strict-integer",
            "base64-decode",
            "quality-record",
            ...library,
            "api-entry",
        ],
        roots: [
            "ResolveUrl",
            "Browse",
            "Next",
            "Player",
            "Search",
            "Shorts",
            "Guide",
            "Setting",
            "Watch",
        ],
    },
    key: {
        entry: "keyMain",
        parts: [
            "storage",
            "recovery",
            "wire",
            "wire-path",
            "platform",
            "key-entry",
        ],
    },
    ump: {
        entry: "umpMain",
        parts: [
            ...common,
            "options",
            "platform",
            "recovery",
            "strict-integer",
            "base64-decode",
            "quality-record",
            "quality",
            "ai",
            ...controls,
            "content",
            "watch",
            "codec",
            "ump-core",
            "crypto",
            "ump-entry",
        ],
        roots: ["EncryptedResponsePart", "OnesieInnertubeResponse"],
    },
};
function schemaCode(roots: string[]) {
    const included = new Set<string>();
    function include(type: string) {
        if (!schema[type] || included.has(type)) return;
        included.add(type);
        for (const [, , kind] of schema[type]) include(kind);
    }
    for (const type of roots) include(type);
    const subset = Object.fromEntries(
        Object.entries(schema).filter(([type]) => included.has(type)),
    );
    const keys = new Set([
        "richItemContents",
        "overlays",
        "tabs",
        "promotedContents",
        "attachments",
        "smartSkipButton",
        "renderInfo",
    ]);
    const content = new Set(
        Object.keys(subset).filter((type) =>
            subset[type].some(([, name]) => keys.has(name)),
        ),
    );
    for (let size = -1; size !== content.size;) {
        size = content.size;
        for (const [type, fields] of Object.entries(subset))
            if (fields.some(([, , kind]) => content.has(kind)))
                content.add(type);
    }
    return (
        'const textEncoder = new TextEncoder();\nconst utf8 = new TextDecoder("utf-8", { fatal: true });\n' +
        "const schema = " +
        JSON.stringify(subset) +
        ";\n" +
        "const contentTypes = new Set(" +
        JSON.stringify([...content].sort()) +
        ");"
    );
}
function build(role: Role) {
    const { parts, roots, entry } = roles[role];
    const chunks = roots
        ? [schemaCode(roots), ...parts.map(read)]
        : parts.map(read);
    if (role === "response" || role === "ump") {
        const asset = path.join(dir, "assets/on-the-go");
        const manifest = JSON.parse(fs.readFileSync(asset + ".json", "utf8"));
        const resources = fs.readFileSync(asset + ".pb");
        if (
            resources.length !== manifest.bytes ||
            createHash("sha256").update(resources).digest("hex") !==
                manifest.sha256
        )
            throw new Error("On-the-go resource bundle checksum mismatch");
        chunks.unshift(
            "const ON_THE_GO_BUNDLE_TEMPLATE = " +
                JSON.stringify(manifest.rootTemplate) +
                ";\nconst ON_THE_GO_RESOURCES_BASE64 = " +
                JSON.stringify(resources.toString("base64")) +
                ";",
        );
    }
    return (
        "// Generated from modules/youtube/src/ and assets/; run npm run build --workspace youtube.\n" +
        "(() => {\n" +
        chunks.join("\n\n").replace(/[^\n]+/g, "    $&") +
        "\n\n    " +
        entry +
        "();\n})();\n"
    );
}
module.exports = { build, roles };
if (require.main === module) {
    const check = process.argv.includes("--check");
    let stale = false;
    function output(relative: string, contents: string) {
        const file = path.join(root, "dist", relative);
        if (check) {
            if (
                !fs.existsSync(file) ||
                fs.readFileSync(file, "utf8") !== contents
            ) {
                console.error("STALE: " + relative);
                stale = true;
            }
        } else {
            fs.mkdirSync(path.dirname(file), { recursive: true });
            fs.writeFileSync(file, contents);
        }
    }
    for (const role of Object.keys(roles) as Role[]) {
        const { code } = minify_sync(build(role), {
            ecma: 2022,
            compress: { passes: 2 },
            format: { comments: /copyright|@license|@preserve|^!/i },
        });
        if (!code) throw new Error("Empty minified script: " + role);
        const contents = code + "\n";
        new vm.Script(contents, { filename: role + ".js" });
        output(path.join("scripts", "youtube", role + ".js"), contents);
    }
    output(
        path.join("modules", "youtube-enhance.sgmodule"),
        fs.readFileSync(path.join(dir, "youtube-enhance.sgmodule"), "utf8"),
    );
    if (stale) process.exitCode = 1;
}
