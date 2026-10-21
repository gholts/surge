// Only the two missing layouts are bundled. Shared components come from the
// response's definitions or its resource-availability report, never our cache.
function onTheGoResourceId(update: Uint8Array) {
    const resource =
        binaryAt(update, [196886555]) ?? binaryAt(update, [426171394]);
    const id = resource && bytesField(resource, 1, true);
    return id && utf8.decode(id);
}

function bindTemplateReferences(
    bytes: Uint8Array,
    replacements: [Uint8Array, Uint8Array][],
    depth = 0,
): Uint8Array {
    for (const [before, after] of replacements)
        if (sameBytes(bytes, before)) return after;
    if (depth === 96) return bytes;
    let fields: WireField[];
    try {
        fields = wireFields(bytes);
    } catch {
        return bytes; // Literal text and opaque data are not nested messages.
    }
    let changed = false;
    const chunks = fields.map((field) => {
        if (field.wire !== 2) return field.raw;
        const data = bindTemplateReferences(
            field.data,
            replacements,
            depth + 1,
        );
        if (data === field.data) return field.raw;
        changed = true;
        return nativeField(field.no, data);
    });
    return changed ? concatBytes(chunks) : bytes;
}

function prepareOnTheGoResources(message: Message<"Next">) {
    if (unknownFields(message).some((field) => field.no === 777)) return;
    const framework = message.frameworkUpdates;
    const updates = framework && binaryAt(framework, [2]);
    if (!updates) return;
    const available = new Set<string>(),
        defined = new Set<string>();
    for (const field of wireFields(updates)) {
        if (field.no !== 1 || field.wire !== 2) continue;
        const id = onTheGoResourceId(field.data);
        if (id) {
            available.add(id);
            defined.add(id);
        }
        const report = binaryAt(field.data, [328964737]);
        if (!report) continue;
        for (const item of wireFields(report)) {
            if (item.no !== 1 || item.wire !== 2) continue;
            const name = binaryAt(item.data, [1]);
            const status = wireFields(item.data).find(
                (f) => f.no === 2 && f.wire === 0,
            );
            // 1 = already available to the client; 2 = attached in this response.
            if (name && status && [1, 2].includes(numberValue(status.data)))
                available.add(utf8.decode(name));
        }
    }
    const bundled = wireFields(decodeBase64(ON_THE_GO_RESOURCES_BASE64));
    const bundledIds = new Set(
        bundled.map((field) => onTheGoResourceId(field.data)),
    );
    const missing: Uint8Array[] = [];
    let template = ON_THE_GO_BUNDLE_TEMPLATE;
    for (const entry of bundled) {
        let resource = binaryAt(entry.data, [196886555])!;
        let id = onTheGoResourceId(entry.data)!;
        const replacements: [Uint8Array, Uint8Array][] = [];
        for (const dep of wireFields(resource).filter(
            (f) => f.no === 5 && f.wire === 2,
        )) {
            const name = utf8.decode(dep.data);
            if (bundledIds.has(name) || available.has(name)) continue;
            // Match a public component by name. Fragment IDs have no interchangeable version.
            const prefix = name.slice(0, name.indexOf("|") + 1);
            const matches = prefix
                ? [...available].filter((value) => value.startsWith(prefix))
                : [];
            if (matches.length !== 1) return;
            replacements.push([dep.data, textEncoder.encode(matches[0])]);
        }
        if (replacements.length) {
            resource = bindTemplateReferences(resource, replacements);
            if (
                replacements.some(([before]) =>
                    containsMarker(resource, before),
                )
            )
                return;
            const bound = binaryAt(resource, [2])!;
            // Separate cache identity for each rebound layout; no account data is involved.
            let hash = 2166136261;
            for (const byte of bound) hash = Math.imul(hash ^ byte, 16777619);
            id = id.split("|")[0] + "|" + (hash >>> 0).toString(16);
            resource = concatBytes(
                wireFields(resource).flatMap((field) => {
                    if (field.no === 4) return [];
                    if (field.no === 1 && field.wire === 2)
                        return [nativeField(1, id)];
                    return [field.raw];
                }),
            );
            if (onTheGoResourceId(entry.data) === template) template = id;
        }
        if (!defined.has(id))
            missing.push(nativePath([1, 196886555], resource));
    }
    return {
        template,
        framework: missing.length
            ? rewriteBinaryPath(framework!, [2], () =>
                  concatBytes([updates, ...missing]),
              )
            : framework!,
    };
}
