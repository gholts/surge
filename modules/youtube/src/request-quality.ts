function setQuality(bytes: Uint8Array, quality: SelectedQuality | undefined) {
    // A fresh manual selection plus sticky resolution prevents ABR downgrades.
    // Without a matching catalogue, retain the higher-quality preference.
    const values = new Map(
            quality
                ? [
                      [13, 0],
                      [14, 2],
                      [16, quality.height],
                      [21, quality.height],
                      [26, 3],
                      [30, 0],
                  ]
                : [
                      [16, 4320],
                      [26, 1],
                      [30, 0],
                  ],
        ),
        seen = new Set<number>(),
        chunks: Uint8Array[] = [];
    let changed = false;
    for (const field of wireFields(bytes)) {
        const value = field.wire === 0 ? values.get(field.no) : undefined;
        if (value !== undefined) {
            if (readInteger(field.data) === value) chunks.push(field.raw);
            else {
                chunks.push(varint(field.no * 8), varint(value));
                changed = true;
            }
            seen.add(field.no);
        } else chunks.push(field.raw);
    }
    for (const [no, value] of values)
        if (!seen.has(no)) {
            chunks.push(varint(no * 8), varint(value));
            changed = true;
        }
    return changed ? concatBytes(chunks) : bytes;
}
function preferInitialQuality(bytes: Uint8Array) {
    // OnesieRequest carries ClientAbrState at field 2, before initial media.
    // Keep the encrypted request and signed configuration byte-for-byte intact.
    const fields = wireFields(bytes);
    const states = fields.filter((field) => field.no === 2 && field.wire === 2);
    if (states.length !== 1) return bytes;
    const state = states[0];
    const output = setQuality(state.data, undefined);
    return output === state.data
        ? bytes
        : concatBytes(
              fields.map((field) =>
                  field === state
                      ? concatBytes([varint(18), varint(output.length), output])
                      : field.raw,
              ),
          );
}

function selectQuality(
    fields: WireField[],
    url: string,
): SelectedQuality | undefined {
    try {
        const match = /[?&]id=([^&]+)/.exec(url);
        if (!match) return;
        const config = fields.find(
            (field) => field.no === 5 && field.wire === 2,
        );
        const signed = config && bytesField(config.data, 1);
        if (!signed?.length) return;
        const quality = readConfig(QUALITY_KEY, QUALITY_LIMIT)?.[
            decodeURIComponent(match[1])
        ];
        if (!validQuality(quality)) return;
        // Copy complete IDs from this request's allowed list; never invent an
        // itag, timestamp, tag or authorization, nor modify the signed config.
        const formats: Uint8Array[] = [],
            premium: Uint8Array[] = [];
        for (const field of wireFields(signed)) {
            if (field.no !== 6 || field.wire !== 2) continue;
            const itag = wireFields(field.data).find(
                (field) => field.no === 1 && field.wire === 0,
            );
            if (!itag) continue;
            const id = readInteger(itag.data);
            if (!quality.itags.includes(id)) continue;
            formats.push(field.data);
            if (quality.premiumItags?.includes(id)) premium.push(field.data);
        }
        return formats.length
            ? {
                  height: quality.height,
                  formats: premium.length ? premium : formats,
              }
            : undefined;
    } catch {
        return undefined;
    }
}
function forceHighestQuality(bytes: Uint8Array, url: string) {
    const fields = wireFields(bytes),
        quality = selectQuality(fields, url);
    const selected = fields.filter(
        (field) => field.no === 17 && field.wire === 2,
    );
    const replaceFormats =
        quality &&
        (selected.length !== quality.formats.length ||
            selected.some(
                (field, i) => !sameBytes(field.data, quality.formats[i]),
            ));
    const chunks: Uint8Array[] = [];
    let found = false,
        changed = !!replaceFormats;
    for (const field of fields) {
        if (field.no === 1 && field.wire === 2) {
            const state = setQuality(field.data, quality);
            if (state === field.data) chunks.push(field.raw);
            else {
                chunks.push(varint(10), varint(state.length), state);
                changed = true;
            }
            found = true;
        } else if (replaceFormats && field.no === 17 && field.wire === 2) {
            continue;
        } else chunks.push(field.raw);
    }
    if (!found) {
        const state = setQuality(new Uint8Array(), quality);
        chunks.push(varint(10), varint(state.length), state);
        changed = true;
    }
    if (replaceFormats)
        for (const format of quality.formats)
            chunks.push(varint(17 * 8 + 2), varint(format.length), format);
    return changed ? concatBytes(chunks) : bytes;
}
