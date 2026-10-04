class UmpReader {
    declare buffer: Uint8Array;
    declare offset: number;
    constructor(buffer: Uint8Array) {
        this.buffer = buffer;
        this.offset = 0;
    }
    readByte() {
        if (this.offset >= this.buffer.length)
            throw new Error("Truncated UMP header");
        return this.buffer[this.offset++];
    }
    readVarint() {
        const first = this.readByte();
        let size = 5;
        for (let candidate = 1; candidate < 5; candidate++) {
            if (!(first & (128 >> (candidate - 1)))) {
                size = candidate;
                break;
            }
        }
        let bits = size === 5 ? 0 : 8 - size;
        let value = size === 5 ? 0 : first & ((1 << bits) - 1);
        for (let index = 1; index < size; index++, bits += 8)
            value += this.readByte() * 2 ** bits;
        return value;
    }
    readPart() {
        const start = this.offset;
        const type = this.readVarint(),
            length = this.readVarint();
        if (length > this.buffer.length - this.offset)
            throw new Error("Truncated UMP payload");
        const data = this.buffer.subarray(this.offset, this.offset + length);
        this.offset += length;
        return {
            type,
            data,
            originalData: data,
            raw: this.buffer.subarray(start, this.offset),
        };
    }
    get hasNext() {
        return this.offset < this.buffer.length;
    }
}
class UmpWriter {
    declare buffer: Uint8Array;
    declare length: number;
    constructor(capacity = 1024) {
        this.buffer = new Uint8Array(capacity);
        this.length = 0;
    }
    ensureCapacity(length: number) {
        if (this.length + length <= this.buffer.length) return;
        const buffer = new Uint8Array(
            Math.max(this.buffer.length * 2, this.length + length),
        );
        buffer.set(this.buffer);
        this.buffer = buffer;
    }
    writeByte(value: number) {
        this.ensureCapacity(1);
        this.buffer[this.length++] = value & 255;
    }
    writeVarint(value: number) {
        if (!Number.isInteger(value) || value < 0 || value > 0xffffffff)
            throw new Error("Invalid UMP integer");
        const size =
            value < 128
                ? 1
                : value < 16384
                  ? 2
                  : value < 2097152
                    ? 3
                    : value < 268435456
                      ? 4
                      : 5;
        if (size === 1) return this.writeByte(value);
        if (size === 5) this.writeByte(240);
        else
            this.writeByte(
                (256 - (256 >> (size - 1))) | (value & ((1 << (8 - size)) - 1)),
            );
        for (
            let index = 1, shift = size === 5 ? 0 : 8 - size;
            index < size;
            index++, shift += 8
        )
            this.writeByte(Math.floor(value / 2 ** shift));
    }
    writePart({ type, data }: { type: number; data: Uint8Array }) {
        this.writeVarint(type);
        this.writeVarint(data.length);
        this.ensureCapacity(data.length);
        this.buffer.set(data, this.length);
        this.length += data.length;
    }
    finish() {
        return this.buffer.subarray(0, this.length);
    }
}
async function transformUmp(
    body: Uint8Array,
    key: Uint8Array,
    options: Options,
) {
    let crypto:
        | InstanceType<ReturnType<typeof createUmpPrimitives>["CryptoContext"]>
        | undefined;
    const envelopeCodec = codec("EncryptedResponsePart");
    const contentCodec = codec("OnesieInnertubeResponse");
    const reader = new UmpReader(body),
        chunks: Uint8Array[] = [];
    const players: Message<"Player">[] = [];
    let changed = false;
    let rewriteNextPart = false;
    async function rewritePayload(bytes: Uint8Array) {
        const part = envelopeCodec.fromBinary(bytes);
        if (
            !(part.encryptedContent instanceof Uint8Array) ||
            part.iv?.length !== 16 ||
            part.hmac?.length !== 32
        )
            throw new Error("Malformed encrypted UMP envelope");
        if ((part.compressionAlgorithm ?? 0) > 1)
            throw new Error("Unsupported UMP compression");
        if (!crypto) {
            const { CryptoContext } = createUmpPrimitives();
            crypto = new CryptoContext(key);
        }
        const decrypted = crypto.decrypt(
            part as Message<"EncryptedResponsePart"> & {
                encryptedContent: Uint8Array;
                iv: Uint8Array;
                hmac: Uint8Array;
            },
        );
        const gzipped = decrypted[0] === 31 && decrypted[1] === 139;
        if (part.compressionAlgorithm === 1 && !gzipped)
            throw new Error("Invalid UMP gzip payload");
        const plaintext = gzipped
            ? await transformGzip(decrypted, true)
            : decrypted;
        const content = contentCodec.fromBinary(plaintext);
        if (options.autoHd !== false)
            for (const item of content.contents)
                if (item.player) players.push(item.player);
        if (!transformWatch(content, options)) return bytes;
        const output = contentCodec.toBinary(content);
        if (sameBytes(output, plaintext)) return bytes;
        const compressed = gzipped
            ? await transformGzip(output, false)
            : output;
        const encrypted = crypto.encrypt(compressed);
        setField(part, "encryptedContent", encrypted.encryptedContent);
        setField(part, "hmac", encrypted.hmac);
        return envelopeCodec.toBinary(part);
    }
    while (reader.hasNext) {
        const part = reader.readPart();
        if (part.type === 10) {
            const type = wireFields(part.data).find(
                (field) => field.no === 1 && field.wire === 0,
            );
            rewriteNextPart = !!type && numberValue(type.data) === 25;
        } else if (part.type === 11 && rewriteNextPart) {
            part.data = await rewritePayload(part.data);
            rewriteNextPart = false;
        }
        if (part.data === part.originalData) chunks.push(part.raw);
        else {
            changed = true;
            const writer = new UmpWriter(part.data.length + 10);
            writer.writePart(part);
            chunks.push(writer.finish());
        }
    }
    return { body: changed ? concatBytes(chunks) : body, players };
}

async function transformGzip(bytes: Uint8Array, decompress: boolean) {
    const stream = decompress
        ? new DecompressionStream("gzip")
        : new CompressionStream("gzip");
    const reader = stream.readable.getReader();
    const writer = stream.writable.getWriter();
    const reading = (async () => {
        const chunks: Uint8Array[] = [];
        let length = 0;
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            length += value.length;
            if (decompress && length > 16 * 1024 * 1024)
                throw new Error("UMP decompression exceeds 16 MiB");
            chunks.push(value);
        }
        return concatBytes(chunks);
    })();
    const writing = (async () => {
        await writer.write(bytes as Uint8Array<ArrayBuffer>);
        await writer.close();
    })();
    try {
        return (await Promise.all([reading, writing]))[0];
    } catch (error) {
        await Promise.allSettled([reader.cancel(error), writer.abort(error)]);
        // Surge's stream rejects concatenated members; its native utility
        // preserves the previous inflater's first-member behavior.
        if (
            decompress &&
            (error as { message?: unknown } | null | undefined)?.message ===
                "Extra bytes past the end."
        ) {
            const firstMember = $utils.ungzip(bytes);
            if (firstMember && firstMember.length <= 16 * 1024 * 1024)
                return firstMember;
        }
        throw error;
    } finally {
        reader.releaseLock();
        writer.releaseLock();
    }
}
