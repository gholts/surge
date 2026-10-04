// Generated from modules/youtube/src/; edit fragments, then run npm run build --workspace youtube.
(() => {
    const CONFIG_KEY = "YouTubeConfig";
    const QUALITY_KEY = "YouTubeQuality";
    function readConfig(key = CONFIG_KEY, limit = Infinity) {
        // I/O errors must propagate: a failed read is not an empty configuration.
        const stored = $persistentStore.read(key);
        if (typeof stored === "string" && stored.length > limit)
            return {};
        try {
            const value = JSON.parse(stored || "{}");
            return value && typeof value === "object" && !Array.isArray(value)
                ? value
                : {};
        }
        catch {
            return {};
        }
    }
    function writeConfig(config, key = CONFIG_KEY) {
        return $persistentStore.write(JSON.stringify(config), key);
    }

    function wireFields(bytes) {
        const fields = [];
        let offset = 0;
        function read() {
            let value = 0, scale = 1;
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
            const start = offset, tag = read(), no = Math.floor(tag / 8), wire = tag % 8;
            if (!no)
                throw new Error("Invalid protobuf field");
            let payloadStart = offset;
            if (wire === 2) {
                const length = read();
                payloadStart = offset;
                offset += length;
            }
            else if (wire === 1)
                offset += 8;
            else if (wire === 5)
                offset += 4;
            else if (wire === 0) {
                let count = 0, byte;
                do {
                    if (offset >= bytes.length || count++ === 10)
                        throw new Error("Invalid protobuf integer");
                    byte = bytes[offset++];
                    if (count === 10 && byte > 1)
                        throw new Error("Protobuf integer overflow");
                } while (byte & 128);
            }
            else
                throw new Error("Unsupported protobuf wire type " + wire);
            if (offset > bytes.length)
                throw new Error("Truncated protobuf field");
            fields.push({
                no,
                wire,
                data: bytes.subarray(payloadStart, offset),
                raw: bytes.subarray(start, offset),
            });
        }
        return fields;
    }

    function bytesField(bytes, number, unique = false) {
        let first;
        for (const field of wireFields(bytes)) {
            if (field.no !== number || field.wire !== 2)
                continue;
            if (!unique)
                return field.data;
            if (first)
                return;
            first = field.data;
        }
        return first;
    }

    function platformKey(request) {
        return Object.entries(request.headers ?? {}).some(([name, value]) => name.toLowerCase() === "user-agent" && /music/i.test(value))
            ? "youtubeMusic"
            : "youtube";
    }

    function keyMain() {
        try {
            const endpoint = $request.url.split("?")[0].split("/youtubei/v1/")[1];
            if ((endpoint !== "config" && endpoint !== "log_event") ||
                !$response.body?.length)
                return $done();
            let group = $response.body;
            for (const no of [1, 16, 7, 138536474, 146311580]) {
                group = bytesField(group, no, true);
                if (!group)
                    return $done();
            }
            const clientKey = bytesField(group, 1, true), encryptKey = bytesField(group, 2, true);
            if (clientKey?.length &&
                encryptKey?.length &&
                clientKey.length <= 4096 &&
                encryptKey.length <= 4096) {
                const platform = platformKey($request), config = readConfig();
                const value = {
                    clientKey: clientKey.toBase64(),
                    encryptKey: encryptKey.toBase64(),
                };
                if (config[platform]?.clientKey !==
                    value.clientKey ||
                    config[platform]?.encryptKey !==
                        value.encryptKey) {
                    config[platform] = value;
                    if (!writeConfig(config))
                        console.log("YouTube key write failed");
                }
            }
            $done();
        }
        catch (error) {
            console.log("YouTube keys: " + error);
            $done();
        }
    }

    keyMain();
})();
