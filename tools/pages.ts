import { $, Glob } from "bun";
import { cp, readdir, rm } from "node:fs/promises";
import path from "node:path";

const siteUrl = process.env.SITE_URL || process.env.CF_PAGES_URL;
if (!siteUrl) throw new Error("Set SITE_URL to your public HTTPS origin.");
const site = new URL(siteUrl);
if (site.protocol !== "https:" || site.href !== site.origin + "/")
    throw new Error(
        "SITE_URL must be an HTTPS origin without a path, query, or fragment.",
    );

process.chdir(path.resolve(import.meta.dir, ".."));
const output = "dist/pages";
await rm("dist", { recursive: true, force: true });
await $`${process.execPath} run build`;
await cp("dist/scripts", `${output}/scripts`, { recursive: true });

for await (const name of new Glob("*.sgmodule").scan("dist/modules")) {
    const source = await Bun.file(`dist/modules/${name}`).text();
    const module = source.replaceAll(
        "https://raw.githubusercontent.com/gholts/surge/main/",
        site.origin + "/",
    );
    await Bun.write(`${output}/modules/${name}`, module);
}

const template = await Bun.file("tools/pages.html").text();
const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
const updated = timestamp.replace("T", " ").replace("Z", " UTC");

function renderPage(title: string, navigation: string, content: string) {
    const values: Record<string, string> = {
        title: Bun.escapeHTML(title),
        navigation,
        content,
        timestamp,
        updated,
    };
    return template.replace(/{{(\w+)}}/g, (_, key: string) => values[key]);
}

async function writeDirectory(
    relative = "",
    navigation = '<a href="/">/</a>',
): Promise<string> {
    const directory = `${output}/${relative}`;
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort(
        (a, b) =>
            Number(b.isDirectory()) - Number(a.isDirectory()) ||
            a.name.localeCompare(b.name, "en"),
    );

    const items = [];
    for (const entry of entries) {
        const name = entry.name + (entry.isDirectory() ? "/" : "");
        const target = relative + name;
        const href = "/" + target.split("/").map(encodeURIComponent).join("/");
        const link = `<a href="${href}">${Bun.escapeHTML(name)}</a>`;
        const children = entry.isDirectory()
            ? await writeDirectory(target, navigation + link)
            : "";
        items.push(`<li>${link}${children}</li>`);
    }

    const tree = `<ul>${items.join("")}</ul>`;
    await Bun.write(
        `${directory}/index.html`,
        renderPage("/" + relative, navigation, tree),
    );
    return tree;
}

await writeDirectory();
await Bun.write(
    `${output}/_headers`,
    "/modules/*.sgmodule\n  Content-Type: text/plain; charset=utf-8\n",
);
await Bun.write(
    `${output}/404.html`,
    renderPage("404", '<a href="/">/</a>', "<h1>404</h1>"),
);
