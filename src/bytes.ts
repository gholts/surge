function concatBytes(chunks: Uint8Array[]) {
    const result = new Uint8Array(chunks.reduce((n, b) => n + b.length, 0));
    let offset = 0;
    for (const bytes of chunks) {
        result.set(bytes, offset);
        offset += bytes.length;
    }
    return result;
}
function sameBytes(a: Uint8Array, b: Uint8Array) {
    return (
        a === b ||
        (a.length === b.length && a.every((value, i) => value === b[i]))
    );
}
function varint(value: number) {
    const bytes = [];
    do {
        bytes.push((value % 128) | (value > 127 ? 128 : 0));
        value = Math.floor(value / 128);
    } while (value);
    return new Uint8Array(bytes);
}
