function numberValue(bytes: Uint8Array) {
    const value = readInteger(bytes);
    if (!Number.isSafeInteger(value)) throw new Error("Unsafe decoded integer");
    return value;
}
