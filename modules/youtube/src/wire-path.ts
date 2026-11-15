function bytesField(bytes: Uint8Array, number: number, unique = false) {
    let first: Uint8Array | undefined;
    for (const field of wireFields(bytes)) {
        if (field.no !== number || field.wire !== 2) continue;
        if (!unique) return field.data;
        if (first) return;
        first = field.data;
    }
    return first;
}
// Follow unique length-delimited fields; undefined if any hop is absent or repeated.
function binaryAt(bytes: Uint8Array, path: number[]) {
    let current: Uint8Array | undefined = bytes;
    for (const no of path) {
        current = bytesField(current, no, true);
        if (!current) return;
    }
    return current;
}
