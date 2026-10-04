function decodeBase64(value: string) {
    const normalized = value.replace(/[-_\s=]/g, (character) =>
        character === "-" ? "+" : character === "_" ? "/" : "",
    );
    // Preserve the existing decoder's ignored final six bits; validate that character too.
    const partial = normalized.length % 4 === 1;
    const bytes = Uint8Array.fromBase64(
        partial ? normalized + "A" : normalized,
    );
    return partial ? bytes.subarray(0, -1) : bytes;
}
