function hideCartBanners(): void {
    const body = $response.body;
    if (
        !(body instanceof Uint8Array) ||
        body.length < 12 ||
        body[0] !== 119 ||
        body[1] !== 108 ||
        body[2] !== 109 ||
        body[3] !== 110 ||
        ![20, 21].includes(body[4]) ||
        new DataView(body.buffer, body.byteOffset, body.byteLength).getUint32(
            8,
            true,
        ) !== body.length
    )
        return $done({});

    // WLM contains the same CSS as the captured cart's DOM source. Preserve
    // string lengths and all bytecode offsets; replace only ad wrapper styles.
    const replacement = "display:none!important;";
    const selectors = [".adBanner--", ".adBannerWrap--"];
    const ranges: [number, number][] = [];
    for (let i = 12; i < body.length; i++) {
        if (body[i] !== 46) continue;
        for (const prefix of selectors) {
            let j = 0;
            while (j < prefix.length && body[i + j] === prefix.charCodeAt(j))
                j++;
            if (j !== prefix.length) continue;
            let start = i + j;
            while (
                start < i + prefix.length + 32 &&
                ((body[start] >= 65 && body[start] <= 90) ||
                    (body[start] >= 97 && body[start] <= 122) ||
                    (body[start] >= 48 && body[start] <= 57) ||
                    body[start] === 95)
            )
                start++;
            if (body[start] !== 123) continue;
            start++;
            let end = start;
            while (end < start + 256 && body[end] >= 32 && body[end] < 125)
                end++;
            if (body[end] !== 125 || end - start < replacement.length) continue;
            const style = String.fromCharCode(...body.subarray(start, end));
            if (
                !style.includes("background-color:") ||
                !style.includes("padding:")
            )
                continue;
            ranges.push([start, end]);
        }
    }
    if (!ranges.length) return $done({});
    const output = body.slice();
    for (const [start, end] of ranges) {
        output.fill(32, start, end);
        for (let i = 0; i < replacement.length; i++)
            output[start + i] = replacement.charCodeAt(i);
    }
    const headers = Object.fromEntries(
        Object.entries($response.headers ?? {}).filter(
            ([key]) =>
                !/^(?:content-md5|etag|x-oss-hash-crc64ecma|cache-control)$/i.test(
                    key,
                ),
        ),
    );
    headers["Cache-Control"] = "no-store";
    $done({ body: output, headers });
}
hideCartBanners();
