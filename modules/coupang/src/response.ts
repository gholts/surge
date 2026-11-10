const adModuleIds = [
    "4-stars-and-above",
    "carousel-products",
    "hybrid-vt-widget",
    "c-avenue-nudge",
    "ssva-dynamic-ad-widget",
    "sdp-visually-similar-ads",
    "sdp-bottom-banner",
    "ads-carousel-products",
];

function isAdModule(value: any): boolean {
    return (
        /^(?:ads-carousel-with-dco|ssva-dynamic-ad-widget|middlebanner)$/.test(
            value.name ?? "",
        ) || adModuleIds.includes(value.id)
    );
}

function isAd(value: any): boolean {
    if (!value || typeof value !== "object") return false;
    const entity = value.entity ?? value;
    const data = entity.data ?? entity;
    // adStore alone describes the merchant, not necessarily this placement.
    return (
        isAdModule(value) ||
        entity.isAds === true ||
        data.isAd === true ||
        data.isDisplayAdMark === true ||
        data.adProperty?.ad === true ||
        data.logging?.isAd === true ||
        data.info?.isAd === true ||
        Boolean(entity.widget?.metadata?.displayItem?.sponsoredText) ||
        Boolean(entity.template?.variableFacade?.logging?.adLog) ||
        /^(?:BANNER|RDS_BRAND_SHOP_BANNER|TYPE_ATF_FBT_AD_INFO)$/.test(
            value.type ?? "",
        ) ||
        /^(?:DYNAMIC_GW_BANNER|bannerListWithImageRatio|carouselC1BannerListV2?|skeletonMarketingBanner|downloadEatsAppNudge|downloadEatsAppCarousel)$/.test(
            value.viewType ?? entity.viewType ?? "",
        ) ||
        /^(?:layout_gw_c1_banner|layout_rplus_simple_banner)$/.test(
            entity.widget?.currentTemplate ?? "",
        )
    );
}

function clean(value: any): any {
    if (Array.isArray(value))
        return value.filter((item) => !isAd(item)).map(clean);
    if (!value || typeof value !== "object") return value;
    const widget = value.widget;
    const items = widget?.data?.productUnitItems?.data?.items;
    if (Array.isArray(items)) {
        // Live carousels mix organic streams with paid video cards.
        widget.data.productUnitItems.data.items = items.filter((item: any) => {
            if (item?.id == null) return true;
            const event = widget.event?.["onClickProductUnit" + item.id];
            if (!event?.clickLogging?.adzerkLog?.viewImpression) return true;
            delete widget.event["onClickProductUnit" + item.id];
            delete widget.event["onClickAdBadge" + item.id];
            if (widget.componentLogging)
                delete widget.componentLogging["onLogProductUnit" + item.id];
            return false;
        });
    }
    for (const key of Object.keys(value)) {
        if (key === "bannerData" && Array.isArray(value[key])) {
            value[key] = [];
        } else if (
            ["wowCardBanner", "cmgBottomBanner", "cmgMiddleBanner"].includes(
                key,
            ) ||
            (key === "bottomBanner" && value[key]?.banner?.adLogging)
        ) {
            value[key] = null;
        } else if (/^myeatsBanner(?:Destination|ImageKo|Image)$/.test(key)) {
            value[key] = "";
        } else {
            value[key] = clean(value[key]);
        }
    }
    return value;
}

function cleanJson(value: any, path: string): any {
    if (path.endsWith("/dco-contents")) {
        for (const key of Object.keys(value)) {
            const facade = value[key]?.variableFacade;
            if (
                facade?.logging?.adLog ||
                facade?.carouselItemVariableFacades?.some(
                    (item: any) => item.logging?.adLog,
                )
            )
                delete value[key];
        }
    } else if (/store\.get_gateway_notification(?:_v5)?$/.test(path)) {
        const data = value.data;
        // Preserve order/account notices delivered through the same endpoint.
        if (data?.bannerId || data?.content?.cmsBannerId) {
            value.data = {
                type: null,
                content: null,
                nextActionScheme: null,
                empty: true,
            };
        }
    } else if (path.endsWith("store.top_bar") && value.data) {
        for (const key of ["extensionBanner", "smallBanner"])
            if (key in value.data) value.data[key] = null;
        value.data.onlyDisplayExtensionBanner = false;
    }
    return clean(value);
}

function cleanHtml(body: string): string {
    // Parse captured JSON literals only. Never execute scripts from responses.
    body = body.replace(
        /(window\._GATEWAY_DATA_\s*=\s*decodeGatewayData\(')([^']*)('\))/g,
        (match, prefix: string, encoded: string, suffix: string) => {
            try {
                return (
                    prefix +
                    encodeURIComponent(
                        JSON.stringify(
                            clean(JSON.parse(decodeURIComponent(encoded))),
                        ),
                    ).replace(/'/g, "%27") +
                    suffix
                );
            } catch {
                return match;
            }
        },
    );
    // Bound greedy JSON matching to one script; JSON strings can contain `});`.
    body = body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (script) => {
        for (const pattern of [
            /(window\.modules\.push\()([\s\S]*)(\);?)(?=\s*<\/script>)/,
            /(window\.__root_state__\s*=\s*)(\{[\s\S]*\})(;?)(?=\s*<\/script>)/,
        ]) {
            script = script.replace(
                pattern,
                (match, prefix: string, literal: string, suffix: string) => {
                    try {
                        const value = JSON.parse(literal);
                        if (
                            prefix.includes("modules.push") &&
                            isAdModule(value)
                        )
                            return "";
                        return (
                            prefix +
                            JSON.stringify(clean(value)).replace(
                                /</g,
                                "\\u003c",
                            ) +
                            suffix
                        );
                    } catch {
                        return match;
                    }
                },
            );
        }
        return script;
    });
    if (body.includes('data-module="selling-points"')) {
        body = body.replace(
            /<\/head>/i,
            "<style>" +
                adModuleIds.map((id) => '[id="' + id + '"]').join(",") +
                "{display:none!important}</style></head>",
        );
    }
    return body;
}

function main(): void {
    const body = $response.body;
    if (!body) return $done({});
    try {
        const path = $request.url.split("?")[0];
        const output = /^\s*</.test(body)
            ? cleanHtml(body)
            : JSON.stringify(cleanJson(JSON.parse(body), path));
        $done(output === body ? {} : { body: output });
    } catch {
        $done({});
    }
}
main();
