import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createHash } from "node:crypto";
import { compile, emitModule, emitScript } from "../../tools/lib";
type Schema = Record<
    string,
    readonly (readonly [number, string, string, true?])[]
>;
const dir = import.meta.dir;
const sources = compile(dir);
function read(name: string) {
    const contents = sources.get(name);
    if (contents === undefined) throw new Error("Missing source: " + name);
    return contents.replace(/^"use strict";\n/, "").trim();
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
    { parts: string[]; roots?: string[]; entry: string }
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
    for (const type of roots) {
        if (!schema[type]) throw new Error("Unknown schema root: " + type);
        include(type);
    }
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
export function build(role: Role) {
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
        "// Build: bun run build youtube\n" +
        "(() => {\n" +
        chunks.join("\n\n").replace(/[^\n]+/g, "    $&") +
        "\n\n    " +
        entry +
        "();\n})();\n"
    );
}
if (import.meta.main) {
    for (const role of Object.keys(roles) as Role[])
        emitScript("youtube", role, build(role));
    emitModule(dir);
}
