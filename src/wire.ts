function wireFields(bytes: Uint8Array): WireField[] {
    const fields: WireField[] = [];
    let offset = 0;
    function read() {
        let value = 0,
            scale = 1;
        for (let i = 0; i < 5; i++) {
            if (offset >= bytes.length)
                throw new Error("Truncated protobuf varint");
            const byte = bytes[offset++];
            value += (byte & 127) * scale;
            if (!(byte & 128)) {
                if (value > 0xffffffff)
                    throw new Error("Protobuf length/tag overflow");
                return value;
            }
            scale *= 128;
        }
        throw new Error("Invalid protobuf varint");
    }
    while (offset < bytes.length) {
        const start = offset,
            tag = read(),
            no = Math.floor(tag / 8),
            wire = tag % 8;
        if (!no) throw new Error("Invalid protobuf field");
        let payloadStart = offset;
        if (wire === 2) {
            const length = read();
            payloadStart = offset;
            offset += length;
        } else if (wire === 1) offset += 8;
        else if (wire === 5) offset += 4;
        else if (wire === 0) {
            let count = 0,
                byte;
            do {
                if (offset >= bytes.length || count++ === 10)
                    throw new Error("Invalid protobuf integer");
                byte = bytes[offset++];
                if (count === 10 && byte > 1)
                    throw new Error("Protobuf integer overflow");
            } while (byte & 128);
        } else throw new Error("Unsupported protobuf wire type " + wire);
        if (offset > bytes.length) throw new Error("Truncated protobuf field");
        fields.push({
            no,
            wire,
            data: bytes.subarray(payloadStart, offset),
            raw: bytes.subarray(start, offset),
        });
    }
    return fields;
}
