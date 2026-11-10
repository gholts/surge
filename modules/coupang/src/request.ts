function requestMain(): void {
    const path = $request.url.split("?")[0];
    let body: unknown;
    if (/^https:\/\/api[23]\.branch\.io\//.test(path)) {
        const agent = Object.entries($request.headers ?? {}).find(
            ([key]) => key.toLowerCase() === "user-agent",
        )?.[1];
        if (!/^Eats-AppStore\//.test(agent ?? "")) return $done({});
        body = {};
    } else if (path.includes("cmapi.coupang.com/")) {
        body = {
            rCode: "RET0000",
            rMessage: "Success",
            ...(path.endsWith("/search-home/banner")
                ? { rData: {} }
                : path.endsWith("/lapse-promotion-widget-data")
                  ? { rData: { entityList: [] } }
                  : {}),
        };
    } else if (path.endsWith("/ad/banner")) {
        body = { css: "", desc: "", adBannerInfo: null, servable: false };
    } else if (path.endsWith("/wowcard/ccm")) {
        body = {
            ccmPopups: [],
            ccmBanners: [],
            showBannerWithPopup: false,
            marchEvent: null,
            retentionEvent: null,
        };
    } else {
        let data: unknown = { entityList: [] };
        if (path.endsWith("ads.splash_screen")) {
            data = {
                useLocalImage: false,
                bannerId: null,
                imageUrl: null,
                imageWidth: null,
                imageHeight: null,
                imagePadding: null,
                displayTime: null,
            };
        } else if (path.endsWith("store.get_bottom_banner_info")) {
            data = { type: null, info: null };
        } else if (path.endsWith("campaign.get_mobile_triggers")) {
            data = { triggers: [] };
        }
        body = { data, error: null };
    }
    $done({
        response: {
            status: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        },
    });
}
requestMain();
