function decodeBase64(value: string) {
    const normalized = value.replace(/[-_\s=]/g, (character) =>
        character === "-" ? "+" : character === "_" ? "/" : "",
    );
    // Validate the final character even when its six bits are ignored.
    const partial = normalized.length % 4 === 1;
    const bytes = Uint8Array.fromBase64(
        partial ? normalized + "A" : normalized,
    );
    return partial ? bytes.subarray(0, -1) : bytes;
}
