// Builds every module in modules/ into dist/, or only the ones named:
//   bun tools/build.ts [module...] [--check]
//
// A module is a directory holding one .sgmodule file and src/*.ts. Each
// src/*.ts becomes dist/scripts/<module>/<name>.js. A module that needs more
// than that ships its own build.ts, which is run instead.
import fs from "node:fs";
import path from "node:path";
import { check, compile, emitModule, emitScript, root, run } from "./lib";
const requested = process.argv.slice(2).filter((arg) => arg !== "--check");
const names = requested.length
    ? requested
    : fs
          .readdirSync(path.join(root, "modules"), { withFileTypes: true })
          .filter((entry) => entry.isDirectory())
          .map((entry) => entry.name)
          .sort();
for (const name of names) {
    const dir = path.join(root, "modules", name);
    const custom = path.join(dir, "build.ts");
    if (fs.existsSync(custom)) run([custom, ...(check ? ["--check"] : [])]);
    else {
        for (const [script, source] of compile(dir))
            emitScript(name, script, "(() => {\n" + source + "\n})();");
        emitModule(dir);
    }
    console.log((check ? "checked " : "built ") + name);
}
