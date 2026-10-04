function readInteger(bytes: Uint8Array) {
    let value = 0,
        scale = 1;
    for (const byte of bytes) {
        value += (byte & 127) * scale;
        scale *= 128;
    }
    return value;
}
