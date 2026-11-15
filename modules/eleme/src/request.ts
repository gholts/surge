const userAgent =
    Object.entries($request.headers ?? {}).find(
        ([name]) => name.toLowerCase() === "user-agent",
    )?.[1] ?? "";

// Works with URL Rewrite disabled.
if (
    /^https:\/\/waimai-guide\.ele\.me\/gw\/mtop\.alsc\.eleme\.bootup\.screen\.data\.get\/1\.0\/?(?:\?|$)/.test(
        $request.url,
    )
) {
    $done({
        response: {
            status: 200,
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Cache-Control": "no-store",
            },
            body: JSON.stringify({
                api: "mtop.alsc.eleme.bootup.screen.data.get",
                data: { code: 0, data: { fields: {} }, message: "SUCCESS" },
                ret: ["SUCCESS::调用成功"],
                v: "1.0",
            }),
        },
    });
    // Shared Alibaba endpoints: require Ele.me user agent.
} else if (
    !/^https?:\/\/(?:s-gm\.mmstat\.com\/arms\.1\.1|wgo\.mmstat\.com\/minitrade\.1\.200\.2)(?:\?|$)/.test(
        $request.url,
    ) ||
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
            // Captured 1x1 tracking GIF.
            body: new Uint8Array([
                71, 73, 70, 56, 57, 97, 1, 0, 1, 0, 128, 1, 0, 0, 0, 0, 255,
                255, 255, 33, 249, 4, 1, 0, 0, 1, 0, 44, 0, 0, 0, 0, 1, 0, 1, 0,
                0, 2, 2, 76, 1, 0, 59,
            ]),
        },
    });
}
