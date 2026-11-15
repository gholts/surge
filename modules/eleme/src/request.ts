const userAgent =
    Object.entries($request.headers ?? {}).find(
        ([name]) => name.toLowerCase() === "user-agent",
    )?.[1] ?? "";

// These shared Alibaba endpoints also serve other apps. Only acknowledge Ele.me.
if (
    !["GET", "POST"].includes($request.method ?? "") ||
    !/(?:^|\s)eleme\/|\bAliApp\(ELMC\//i.test(userAgent)
) {
    $done({});
} else {
    $done({
        response: {
            status: 200,
            headers: {
                "Content-Type": "image/gif",
                "Cache-Control": "no-store",
            },
            // Same successful 1x1 GIF returned by both captured tracking APIs.
            body: new Uint8Array([
                71, 73, 70, 56, 57, 97, 1, 0, 1, 0, 128, 1, 0, 0, 0, 0, 255,
                255, 255, 33, 249, 4, 1, 0, 0, 1, 0, 44, 0, 0, 0, 0, 1, 0, 1, 0,
                0, 2, 2, 76, 1, 0, 59,
            ]),
        },
    });
}
