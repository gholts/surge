function sameQuality(a: QualityRecord | undefined, b: QualityRecord) {
    return (
        a !== undefined &&
        a.height === b.height &&
        a.itags.length === b.itags.length &&
        b.itags.every((itag) => a.itags.includes(itag)) &&
        (a.premiumItags?.length ?? 0) === (b.premiumItags?.length ?? 0) &&
        (b.premiumItags ?? []).every((itag) => a.premiumItags?.includes(itag))
    );
}

function cacheQuality(players: Message<"Player">[]) {
    if (!players.length) return;
    const streams = players
        .map(
            (player) =>
                unknownFields(player).find(
                    (field) => field.no === 4 && field.wire === 2,
                )?.data,
        )
        .filter(Boolean) as Uint8Array[];
    if (!streams.length) return;
    let stored: Record<string, unknown>;
    try {
        stored = readConfig(QUALITY_KEY, QUALITY_LIMIT);
    } catch (error) {
        console.log("YouTube quality read: " + error);
        return;
    }
    const cache: Record<string, QualityRecord> = Object.create(null);
    let changed = false;
    const keys = Object.keys(stored);
    if (keys.length > 16) changed = true;
    for (const id of keys.slice(-16)) {
        const record = stored[id];
        if (id.length > 256 || !validQuality(record)) {
            changed = true;
            continue;
        }
        cache[id] = { height: record.height, itags: record.itags };
        if (record.premiumItags?.length)
            cache[id].premiumItags = record.premiumItags;
        if (Object.keys(record).length !== Object.keys(cache[id]).length)
            changed = true;
    }
    for (const stream of streams) {
        try {
            const fields = wireFields(stream);
            const url = fields.find(
                (field) => field.no === 15 && field.wire === 2,
            );
            const match = url && /[?&]id=([^&]+)/.exec(utf8.decode(url.data));
            if (!match) continue;
            const id = decodeURIComponent(match[1]),
                quality: QualityRecord = { height: 0, itags: [] };
            if (id.length > 256) continue;
            const itags = new Set<number>();
            let overflow = false;
            for (const field of fields) {
                if (field.no !== 3 || field.wire !== 2) continue;
                const format = wireFields(field.data);
                const mime = format.find(
                    (field) => field.no === 5 && field.wire === 2,
                );
                if (!mime || !utf8.decode(mime.data).startsWith("video/"))
                    continue;
                const value = (no: number) => {
                    const field = format.find(
                        (field) => field.no === no && field.wire === 0,
                    );
                    return field ? numberValue(field.data) : 0;
                };
                const height = Math.min(value(7), value(8)),
                    itag = value(1);
                if (
                    !itag ||
                    !height ||
                    height > 0x7fffffff ||
                    height < quality.height
                )
                    continue;
                if (height > quality.height) {
                    quality.height = height;
                    quality.itags = [];
                    delete quality.premiumItags;
                    itags.clear();
                    overflow = false;
                }
                if (overflow || itags.has(itag)) continue;
                if (itags.size === 256) {
                    overflow = true;
                    continue;
                }
                itags.add(itag);
                quality.itags.push(itag);
                const label = format.find(
                    (field) => field.no === 26 && field.wire === 2,
                );
                if (label && /\bPremium\b/i.test(utf8.decode(label.data)))
                    (quality.premiumItags ??= []).push(itag);
            }
            if (
                overflow ||
                !validQuality(quality) ||
                sameQuality(cache[id], quality)
            )
                continue;
            delete cache[id];
            cache[id] = quality;
            changed = true;
        } catch (error) {
            console.log("YouTube quality metadata: " + error);
        }
    }
    if (changed) {
        const keys = Object.keys(cache);
        for (const key of keys.slice(0, Math.max(0, keys.length - 16)))
            delete cache[key];
        try {
            let serialized = JSON.stringify(cache);
            while (textEncoder.encode(serialized).length > QUALITY_LIMIT) {
                delete cache[Object.keys(cache)[0]];
                serialized = JSON.stringify(cache);
            }
            if (!$persistentStore.write(serialized, QUALITY_KEY))
                console.log("YouTube quality write failed");
        } catch (error) {
            console.log("YouTube quality cache: " + error);
        }
    }
}
