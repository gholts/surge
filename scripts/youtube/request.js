// YouTube request runtime: block ad breaks, negotiate keys, prefer maximum quality.
(() => {
    const CONFIG_KEY = "YouTubeConfig";

    // 1. Surge dispatch. Request handlers return a result; only main calls $done.
    function main() {
        const path = $request.url.split("?")[0],
            platform = platformKey($request);
        try {
            let result = {};
            if (path.endsWith("/player/ad_break")) result = emptyPlayback();
            else if (path.endsWith("/log_event"))
                result = prepareLogEvent($request.headers, platform);
            else if (path.endsWith("/initplayback"))
                result = preparePlayback($request.body, platform);
            else if (path.endsWith("/videoplayback")) {
                const options = readOptions();
                if (
                    options.autoHd !== false &&
                    $request.body instanceof Uint8Array &&
                    $request.body.length
                )
                    result = { body: forceHighestQuality($request.body) };
            }
            $done(result);
        } catch (error) {
            console.log("YouTube request: " + error);
            if (path.endsWith("/initplayback")) {
                clearKeys(platform);
                $done(emptyPlayback());
            } else $done({});
        }
    }
    function emptyPlayback() {
        return {
            response: {
                status: 200,
                headers: { "Content-Type": "application/x-protobuf" },
                body: new Uint8Array(),
            },
        };
    }
    function prepareLogEvent(requestHeaders, platform) {
        const headers = { ...requestHeaders };
        if (!readConfig()[platform]?.clientKey)
            for (const name of Object.keys(headers))
                if (name.toLowerCase() === "x-youtube-hot-hash-data")
                    delete headers[name];
        return { headers };
    }
    function preparePlayback(body, platform) {
        const key = readConfig()[platform]?.encryptKey;
        const encrypted = body instanceof Uint8Array && bytesField(body, 3);
        const clientKey = encrypted && bytesField(encrypted, 5);
        if (key && clientKey && sameBytes(clientKey, decodeBase64(key)))
            return {};
        clearKeys(platform);
        return emptyPlayback();
    }

    // 2. Auto HD: edit only SABR quality preferences; preserve every other field.
    function setQuality(bytes) {
        // SABR ClientAbrState: highest resolution ceiling, high-quality preference.
        const values = new Map([
                [16, 4320],
                [26, 1],
            ]),
            seen = new Set(),
            chunks = [];
        for (const field of wireFields(bytes)) {
            if (field.wire === 0 && values.has(field.no)) {
                chunks.push(varint(field.no * 8), varint(values.get(field.no)));
                seen.add(field.no);
            } else chunks.push(field.raw);
        }
        for (const [no, value] of values)
            if (!seen.has(no)) chunks.push(varint(no * 8), varint(value));
        return concatBytes(chunks);
    }
    function forceHighestQuality(bytes) {
        const chunks = [];
        let found = false;
        for (const field of wireFields(bytes)) {
            if (field.no === 1 && field.wire === 2) {
                const quality = setQuality(field.data);
                chunks.push(varint(10), varint(quality.length), quality);
                found = true;
            } else chunks.push(field.raw);
        }
        if (!found) {
            const quality = setQuality(new Uint8Array());
            chunks.push(varint(10), varint(quality.length), quality);
        }
        return concatBytes(chunks);
    }

    // 3. Configuration and persistent key state.
    function readOptions(defaults = {}) {
        return typeof $argument === "string" && !$argument.includes("{{{")
            ? { ...defaults, ...JSON.parse($argument) }
            : defaults;
    }
    function platformKey(request) {
        return Object.entries(request.headers ?? {}).some(
            ([name, value]) =>
                name.toLowerCase() === "user-agent" && /music/i.test(value),
        )
            ? "youtubeMusic"
            : "youtube";
    }
    function readConfig() {
        try {
            return JSON.parse($persistentStore.read(CONFIG_KEY) || "{}");
        } catch {
            return {};
        }
    }
    function writeConfig(config) {
        $persistentStore.write(JSON.stringify(config), CONFIG_KEY);
    }
    function clearKeys(platform) {
        const config = readConfig();
        if (config[platform]) {
            delete config[platform];
            writeConfig(config);
        }
    }

    // 4. Byte helpers are local because Surge loads each script independently.
    function bytesField(bytes, number) {
        return wireFields(bytes).find(
            (field) => field.no === number && field.wire === 2,
        )?.data;
    }
    function concatBytes(chunks) {
        const result = new Uint8Array(chunks.reduce((n, b) => n + b.length, 0));
        let offset = 0;
        for (const bytes of chunks) {
            result.set(bytes, offset);
            offset += bytes.length;
        }
        return result;
    }
    function sameBytes(a, b) {
        return (
            a === b ||
            (a.length === b.length && a.every((value, i) => value === b[i]))
        );
    }
    function varint(value) {
        const bytes = [];
        do {
            bytes.push((value % 128) | (value > 127 ? 128 : 0));
            value = Math.floor(value / 128);
        } while (value);
        return new Uint8Array(bytes);
    }
    function wireFields(bytes) {
        const fields = [];
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
    function decodeBase64(value) {
        const alphabet =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        let buffer = 0,
            bits = 0;
        const output = [];
        for (const character of value.replace(/-/g, "+").replace(/_/g, "/")) {
            if (/\s|=/.test(character)) continue;
            const index = alphabet.indexOf(character);
            if (index < 0) throw new Error("Invalid base64 key");
            buffer = (buffer << 6) | index;
            bits += 6;
            if (bits >= 8) {
                bits -= 8;
                output.push((buffer >>> bits) & 255);
            }
        }
        return new Uint8Array(output);
    }

    main();
})();
