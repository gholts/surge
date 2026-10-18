// Quest HLS retiming: preserve H264 frames; decode, speed up, and re-encode AAC.
// iOS WebView media codecs required. Audio pitch rises with playback speed.
const CLOCK = 2 ** 33;
function join(parts) {
    const output = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
    let at = 0;
    for (const part of parts) {
        output.set(part, at);
        at += part.length;
    }
    return output;
}
function pts(bytes, at) {
    return (
        ((bytes[at] >> 1) & 7) * 2 ** 30 +
        bytes[at + 1] * 2 ** 22 +
        ((bytes[at + 2] >> 1) & 127) * 2 ** 15 +
        bytes[at + 3] * 128 +
        (bytes[at + 4] >> 1)
    );
}
function putPTS(bytes, at, value, prefix = bytes[at] & 240) {
    value = ((Math.round(value) % CLOCK) + CLOCK) % CLOCK;
    bytes[at] = prefix | ((Math.floor(value / 2 ** 30) & 7) << 1) | 1;
    bytes[at + 1] = Math.floor(value / 2 ** 22) & 255;
    bytes[at + 2] = ((Math.floor(value / 2 ** 15) & 127) << 1) | 1;
    bytes[at + 3] = Math.floor(value / 128) & 255;
    bytes[at + 4] = ((value % 128) << 1) | 1;
}
function clock(value, speed) {
    return (value >= CLOCK / 2 ? value - CLOCK : value) / speed;
}
function payload(packet) {
    const control = (packet[3] >> 4) & 3;
    if (!control) throw new Error("Invalid TS adaptation control");
    const at = 4 + (control & 2 ? 1 + packet[4] : 0);
    if (at > 188) throw new Error("Invalid TS adaptation length");
    return control & 1 ? at : 188;
}
function section(packet) {
    const at = payload(packet);
    return packet.subarray(at + 1 + packet[at]);
}
function inspectTS(input) {
    if (!input.length || input.length % 188)
        throw new Error("Incomplete TS segment");
    const packets = [];
    let pmt;
    for (let i = 0; i < input.length; i += 188) {
        const p = input.subarray(i, i + 188);
        if (p[0] !== 0x47 || p[1] & 128 || p[3] & 192)
            throw new Error("Invalid or encrypted TS");
        packets.push(p);
        if ((((p[1] & 31) << 8) | p[2]) === 0 && p[1] & 64) {
            const s = section(p),
                end = 3 + (((s[1] & 15) << 8) | s[2]) - 4;
            if (s[0] !== 0 || end > s.length)
                throw new Error("Unsupported PAT");
            for (let j = 8; j + 4 <= end; j += 4)
                if (s[j] || s[j + 1]) pmt = ((s[j + 2] & 31) << 8) | s[j + 3];
        }
    }
    let audio, video, pcr;
    for (const p of packets)
        if ((((p[1] & 31) << 8) | p[2]) === pmt && p[1] & 64) {
            const s = section(p),
                end = 3 + (((s[1] & 15) << 8) | s[2]) - 4;
            if (s[0] !== 2 || end > s.length)
                throw new Error("Unsupported PMT");
            pcr = ((s[8] & 31) << 8) | s[9];
            for (
                let j = 12 + (((s[10] & 15) << 8) | s[11]);
                j + 5 <= end;
                j += 5 + (((s[j + 3] & 15) << 8) | s[j + 4])
            ) {
                const pid = ((s[j + 1] & 31) << 8) | s[j + 2];
                if (s[j] === 15) {
                    if (audio !== undefined && audio !== pid)
                        throw new Error("Multiple audio tracks");
                    audio = pid;
                }
                if (s[j] === 27) video = pid;
            }
        }
    if (audio === undefined || video === undefined || pcr !== video)
        throw new Error("H264/AAC with video PCR required");
    const chunks = [];
    let current;
    for (let i = 0; i < packets.length; i++) {
        const p = packets[i],
            pid = ((p[1] & 31) << 8) | p[2];
        if (pid !== audio) continue;
        const at = payload(p);
        if (at === 188) continue;
        if (p[1] & 64) {
            if (current) chunks.push(current);
            current = { index: i, parts: [] };
        }
        if (!current) throw new Error("Audio starts mid-PES");
        current.parts.push(p.subarray(at));
    }
    if (current) chunks.push(current);
    const pes = chunks.map((c) => {
        const b = join(c.parts),
            length = ((b[4] << 8) | b[5]) + 6,
            start = 9 + b[8];
        if (
            b[0] ||
            b[1] ||
            b[2] !== 1 ||
            !(b[7] & 128) ||
            length > b.length ||
            start > length
        )
            throw new Error("Invalid audio PES");
        return {
            index: c.index,
            pts: pts(b, 9),
            data: b.subarray(start, length),
        };
    });
    if (!pes.length) throw new Error("Missing audio");
    return { packets, audio, pes };
}
function adtsFrames(data) {
    const rates = [
            96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000,
            12000, 11025, 8000, 7350,
        ],
        frames = [];
    let at = 0,
        duration = 0;
    while (at < data.length) {
        if (
            at + 7 > data.length ||
            data[at] !== 255 ||
            (data[at + 1] & 246) !== 240
        )
            throw new Error("Invalid ADTS");
        const rate = rates[(data[at + 2] >> 2) & 15],
            length =
                ((data[at + 3] & 3) << 11) |
                (data[at + 4] << 3) |
                (data[at + 5] >> 5);
        if (
            !rate ||
            length < 7 ||
            at + length > data.length ||
            data[at + 6] & 3
        )
            throw new Error("Unsupported AAC frame");
        frames.push(data.subarray(at, at + length));
        duration += 1024 / rate;
        at += length;
    }
    return { frames, duration };
}
function adts(raw, channels) {
    const length = raw.length + 7;
    if (length > 8191) throw new Error("AAC frame too large");
    const out = new Uint8Array(length);
    out.set([
        255,
        241,
        64 | (3 << 2) | (channels >> 2),
        ((channels & 3) << 6) | (length >> 11),
        (length >> 3) & 255,
        ((length & 7) << 5) | 31,
        252,
    ]);
    out.set(raw, 7);
    return out;
}
async function speedAudio(data, speed) {
    const { frames, duration } = adtsFrames(data);
    if (!frames.length || duration > 8)
        throw new Error("Audio segment too long");
    const decode = new OfflineAudioContext(2, 1, 48000);
    // WebKit trims decoder priming. Warm it, then retain one segment's samples.
    const warmed = join([frames[0], frames[0], frames[0], frames[0], data]);
    const decoded = await decode.decodeAudioData(warmed.buffer);
    const expected = Math.round(duration * 48000),
        channels = decoded.numberOfChannels;
    if (channels < 1 || channels > 2 || decoded.length < expected)
        throw new Error("Unexpected decoded audio size");
    const length = Math.ceil(expected / speed),
        offline = new OfflineAudioContext(channels, length, 48000),
        buffer = offline.createBuffer(channels, expected, 48000);
    for (let c = 0; c < channels; c++)
        buffer
            .getChannelData(c)
            .set(decoded.getChannelData(c).subarray(decoded.length - expected));
    const player = offline.createBufferSource();
    player.buffer = buffer;
    player.playbackRate.value = speed;
    player.connect(offline.destination);
    player.start();
    const rendered = await offline.startRendering();
    const encoded = [];
    let failure;
    const encoder = new AudioEncoder({
        output: (chunk) => {
            const data = new Uint8Array(chunk.byteLength);
            chunk.copyTo(data);
            encoded.push(data);
        },
        error: () => {
            failure = true;
        },
    });
    try {
        encoder.configure({
            codec: "mp4a.40.2",
            sampleRate: 48000,
            numberOfChannels: channels,
            bitrate: 128000,
        });
        const pcm = new Float32Array(length * channels);
        for (let c = 0; c < channels; c++)
            pcm.set(rendered.getChannelData(c), c * length);
        const sample = new AudioData({
            format: "f32-planar",
            sampleRate: 48000,
            numberOfFrames: length,
            numberOfChannels: channels,
            timestamp: 0,
            data: pcm,
        });
        encoder.encode(sample);
        sample.close();
        await encoder.flush();
    } finally {
        if (encoder.state !== "closed") encoder.close();
    }
    if (
        failure ||
        encoded.length < 3 ||
        encoded[0].length > 8 ||
        encoded[1].length > 8
    )
        throw new Error("Unexpected AAC encoder priming");
    // Tested WebKit encoder emits two silent priming packets before the audio.
    const count = Math.ceil(length / 1024),
        selected = encoded.slice(2, 2 + count);
    if (selected.length !== count) throw new Error("Incomplete AAC output");
    return selected.map((raw, i) => ({
        data: adts(raw, channels),
        offset: i * 1920,
    }));
}
function retimePacket(original, speed) {
    const p = original.slice(),
        control = (p[3] >> 4) & 3;
    if (control & 2 && p[4]) {
        let at = 6;
        for (const flag of [16, 8])
            if (p[5] & flag) {
                if (at + 6 > 5 + p[4]) throw new Error("Invalid PCR");
                const base =
                        p[at] * 2 ** 25 +
                        p[at + 1] * 2 ** 17 +
                        p[at + 2] * 512 +
                        p[at + 3] * 2 +
                        (p[at + 4] >> 7),
                    ext = ((p[at + 4] & 1) << 8) | p[at + 5];
                let value = Math.round((clock(base, 1) * 300 + ext) / speed);
                const modulus = CLOCK * 300;
                value = ((value % modulus) + modulus) % modulus;
                const b = Math.floor(value / 300),
                    e = value % 300;
                p[at] = Math.floor(b / 2 ** 25);
                p[at + 1] = Math.floor(b / 2 ** 17) & 255;
                p[at + 2] = Math.floor(b / 512) & 255;
                p[at + 3] = Math.floor(b / 2) & 255;
                p[at + 4] = ((b % 2) << 7) | 126 | (e >> 8);
                p[at + 5] = e & 255;
                at += 6;
            }
    }
    const at = payload(p);
    if (
        p[1] & 64 &&
        at + 9 <= 188 &&
        p[at] === 0 &&
        p[at + 1] === 0 &&
        p[at + 2] === 1
    ) {
        const flags = p[at + 7];
        if (flags & 32) throw new Error("ESCR unsupported");
        if (flags & 128) {
            if (at + 14 > 188) throw new Error("Split PTS");
            putPTS(p, at + 9, clock(pts(p, at + 9), speed));
        }
        if (flags & 64) {
            if (at + 19 > 188) throw new Error("Split DTS");
            putPTS(p, at + 14, clock(pts(p, at + 14), speed));
        }
    }
    return p;
}
function audioPES(frame, timestamp) {
    const pes = new Uint8Array(frame.length + 14),
        length = pes.length - 6;
    pes.set([0, 0, 1, 192, length >> 8, length & 255, 128, 128, 5]);
    putPTS(pes, 9, timestamp, 32);
    pes.set(frame, 14);
    return pes;
}
function packetize(data, pid, state) {
    const out = [];
    let at = 0;
    while (at < data.length) {
        const p = new Uint8Array(188);
        p.fill(255);
        const start = at === 0,
            discontinuity = state.first;
        state.first = false;
        const size = Math.min(data.length - at, discontinuity ? 182 : 184);
        const adaptation = 184 - size;
        p[0] = 71;
        p[1] = (start ? 64 : 0) | (pid >> 8);
        p[2] = pid & 255;
        p[3] = (adaptation ? 48 : 16) | state.cc;
        state.cc = (state.cc + 1) % 16;
        let offset = 4;
        if (adaptation) {
            p[4] = adaptation - 1;
            if (adaptation > 1) p[5] = discontinuity ? 128 : 0;
            offset += adaptation;
        }
        p.set(data.subarray(at, at + size), offset);
        at += size;
        out.push(p);
    }
    return out;
}
async function retimeTS(input, speed) {
    if (!(speed > 1 && speed <= 2)) throw new Error("Invalid speed");
    const { packets, audio, pes } = inspectTS(input),
        frames = await speedAudio(join(pes.map((p) => p.data)), speed),
        groups = new Map(),
        first = clock(pes[0].pts, speed);
    let group = 0;
    const state = { cc: packets[pes[0].index][3] & 15, first: true };
    for (const frame of frames) {
        const timestamp = first + frame.offset;
        while (
            group + 1 < pes.length &&
            timestamp >= clock(pes[group + 1].pts, speed)
        )
            group++;
        const data = packetize(audioPES(frame.data, timestamp), audio, state);
        const list = groups.get(pes[group].index) || [];
        list.push(...data);
        groups.set(pes[group].index, list);
    }
    const output = [];
    for (let i = 0; i < packets.length; i++) {
        const p = packets[i];
        if (groups.has(i)) output.push(...groups.get(i));
        if ((((p[1] & 31) << 8) | p[2]) !== audio)
            output.push(retimePacket(p, speed));
    }
    return join(output);
}

const MEDIA_KEY = "discord.quest.video.targets.v1";
function mediaURL(uri, base, quest, video, speed, extension) {
    const url = new URL(uri, base);
    const expected = new RegExp(
        `^/quests/${quest}/${video}_mx[0-9]+h?[0-9]*\\.${extension}$`,
    );
    if (
        url.origin !== "https://cdn.discordapp.com" ||
        !expected.test(url.pathname) ||
        url.search
    )
        throw new Error("Unsupported media URL");
    url.searchParams.set("surge_quest_speed", String(speed));
    url.searchParams.set("surge_quest_v", "1");
    return url.href;
}
function rewritePlaylist(text, base, quest, video, speed) {
    const lines = text.trim().split(/\r?\n/);
    if (
        lines[0] !== "#EXTM3U" ||
        /#EXT-X-(?:KEY|MAP|BYTERANGE|MEDIA:|I-FRAME|DISCONTINUITY|PROGRAM-DATE-TIME)/.test(
            text,
        )
    )
        throw new Error("Unsupported HLS format");
    if (text.includes("#EXT-X-STREAM-INF:")) {
        const output = ["#EXTM3U"];
        let variants = 0;
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line.startsWith("#EXT-X-STREAM-INF:")) continue;
            const uri = lines[++i],
                resolution = /RESOLUTION=([0-9]+)x([0-9]+)/.exec(line),
                fps = /FRAME-RATE=([0-9.]+)/.exec(line);
            if (
                !uri ||
                uri.startsWith("#") ||
                !resolution ||
                Math.min(Number(resolution[1]), Number(resolution[2])) > 720 ||
                !fps ||
                !(Number(fps[1]) > 0 && Number(fps[1]) <= 30.1) ||
                !/CODECS="avc1\.[^,"]+,mp4a\.40\.(?:2|5|29)"/.test(line)
            )
                continue;
            const next = mediaURL(uri, base, quest, video, speed, "m3u8");
            output.push(
                line
                    .replace(
                        /(AVERAGE-BANDWIDTH|BANDWIDTH)=([0-9]+)/g,
                        (_, key, value) =>
                            `${key}=${Math.ceil(Number(value) * speed + 128000)}`,
                    )
                    .replace(
                        /FRAME-RATE=[0-9.]+/,
                        `FRAME-RATE=${Number(fps[1]) * speed}`,
                    )
                    .replace(/mp4a\.40\.(?:5|29)/g, "mp4a.40.2"),
                next,
            );
            variants++;
        }
        if (!variants) throw new Error("No supported H264/AAC variant");
        return output.join("\n") + "\n";
    }
    if (!text.includes("#EXT-X-ENDLIST"))
        throw new Error("Only VOD is supported");
    let maximum = 0,
        segments = 0,
        pending = false;
    const output = lines.map((line) => {
        if (line.startsWith("#EXTINF:")) {
            const duration = Number(line.slice(8).split(",")[0]);
            if (!(duration > 0 && duration <= 8) || pending)
                throw new Error("Unsupported segment duration");
            pending = true;
            maximum = Math.max(maximum, duration / speed);
            return "#EXTINF:" + (duration / speed).toFixed(6) + ",";
        }
        if (line && !line.startsWith("#")) {
            if (!pending) throw new Error("Missing segment duration");
            pending = false;
            segments++;
            return mediaURL(line, base, quest, video, speed, "ts");
        }
        return line;
    });
    if (!segments || pending) throw new Error("Incomplete playlist");
    return (
        output
            .map((line) =>
                line.startsWith("#EXT-X-TARGETDURATION:")
                    ? "#EXT-X-TARGETDURATION:" + Math.ceil(maximum)
                    : line,
            )
            .join("\n") + "\n"
    );
}
function activateMedia(quest, video, speed) {
    const targets = JSON.parse($persistentStore.read(MEDIA_KEY) || "{}"),
        config = targets[quest];
    // Encoding is asynchronous: metadata may have changed while it ran.
    if (
        config?.speed !== speed ||
        !(config.expires > Date.now()) ||
        !config.videos?.includes(video)
    )
        throw new Error("Playback configuration changed");
    if (config.active !== true) {
        config.active = true;
        if (!$persistentStore.write(JSON.stringify(targets), MEDIA_KEY))
            throw new Error("Cannot save playback state");
    }
}
async function handleMedia() {
    const match =
        /^https:\/\/cdn\.discordapp\.com\/quests\/([0-9]+)\/([0-9]+)(?:_[A-Za-z0-9]+)?\.(m3u8|ts)\?surge_quest_speed=([0-9.]+)&surge_quest_v=1(?:&.*)?$/.exec(
            $request.url,
        );
    if (!match || $request.method !== "GET" || typeof $response === "undefined")
        return $done({});
    const [, quest, video, extension, rawSpeed] = match,
        speed = Number(rawSpeed);
    let config;
    try {
        config = JSON.parse($persistentStore.read(MEDIA_KEY) || "{}")[quest];
        if (
            !config ||
            !(config.expires > Date.now()) ||
            config.speed !== speed ||
            speed <= 1 ||
            speed > 2 ||
            !config.videos?.includes(video)
        )
            throw new Error("Playback configuration changed; restart Quest");
        if ($response.status !== 200)
            throw new Error("Media HTTP status " + $response.status);
        if (
            typeof AudioEncoder === "undefined" ||
            typeof AudioData === "undefined" ||
            typeof OfflineAudioContext === "undefined"
        )
            throw new Error("Media codecs unavailable");
        // binary-body-mode already supplies a Uint8Array; avoid copying each segment.
        const bytes = $response.body;
        if (extension === "m3u8") {
            const text = new TextDecoder("utf-8", { fatal: true }).decode(
                bytes,
            );
            const output = rewritePlaylist(
                text,
                $request.url,
                quest,
                video,
                speed,
            );
            return $done({ body: new TextEncoder().encode(output) });
        }
        if (bytes.length > 8 * 1024 * 1024)
            throw new Error("Segment too large");
        const started = Date.now(),
            output = await retimeTS(bytes, speed);
        activateMedia(quest, video, speed);
        console.log(
            JSON.stringify({
                quest,
                mediaSpeed: speed,
                processingMs: Date.now() - started,
                inputBytes: bytes.length,
                outputBytes: output.length,
            }),
        );
        $done({ body: output });
    } catch (error) {
        console.log("Discord Quest media: " + String(error));
        // Buffered accelerated video still needs its original progress mapping.
        // Fall back only before activation; otherwise abort instead of mixing clocks.
        $done(
            extension === "m3u8" && config?.active === false
                ? {}
                : { abort: true },
        );
    }
}
handleMedia();
