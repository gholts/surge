function unlockIcon(): void {
    const body = $response.body;
    if (
        typeof body !== "string" ||
        !/\/(?:gw|h5)\/mtop\.taobao\.vipshop\.blackvip\.(?:track\.info|benefit\.manage\.page\.render)\//.test(
            $request.url,
        )
    )
        return $done({});
    const referrer = Object.entries($request.headers ?? {}).find(
        ([key]) => key.toLowerCase() === "referer",
    )?.[1];
    if (
        !referrer ||
        !/^https:\/\/pages-fast\.m\.taobao\.com\/wow\/z\/app\/tb-vip\/vip-snap-webapp\/app-icon-setting(?:\?|$)/.test(
            referrer,
        )
    )
        return $done({});
    try {
        const response = JSON.parse(body);
        if (
            !Array.isArray(response.ret) ||
            !response.ret.some(
                (status: any) =>
                    typeof status === "string" && status.startsWith("SUCCESS"),
            )
        )
            return $done({});
        const data = response.data;
        if (!data || typeof data !== "object" || Array.isArray(data))
            return $done({});
        let changed = false;
        // The cached icon page reads these response flags. Other member/account
        // pages are excluded by the exact Referer check above.
        if (
            response.api === "mtop.taobao.vipshop.blackvip.track.info" &&
            (data.blackVip === false || data.blackVip === "false")
        ) {
            data.blackVip = typeof data.blackVip === "string" ? "true" : true;
            changed = true;
        }
        if (
            response.api ===
                "mtop.taobao.vipshop.blackvip.benefit.manage.page.render" &&
            (data.support === true || data.support === "true") &&
            Array.isArray(data.supportIcons)
        ) {
            for (const icon of data.supportIcons) {
                if (
                    icon?.iconKey === "AppIconVIP" &&
                    icon.active === false &&
                    icon.canChoose === false
                ) {
                    icon.canChoose = true;
                    changed = true;
                }
            }
            if (data.needAutoSet) {
                data.needAutoSet = false;
                changed = true;
            }
        }
        $done(changed ? { body: JSON.stringify(response) } : {});
    } catch {
        $done({});
    }
}
unlockIcon();
