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
