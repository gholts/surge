function isAd(value: any): boolean {
    return (
        value !== null &&
        typeof value === "object" &&
        (Boolean(value.adId) ||
            Boolean(value.adUnitId) ||
            value.template === "UNQ_AD" ||
            /^adBanner-|^saveList-marketing-|^home-banner$/.test(
                value.key ?? "",
            ) ||
            /AdSummary(?::|$)/.test(value.__typename ?? value.__ref ?? ""))
    );
}

function clean(value: any): any {
    if (Array.isArray(value))
        return value.filter((item) => !isAd(item)).map(clean);
    if (value === null || typeof value !== "object") return value;
    for (const key of Object.keys(value)) {
        const field = key.split("(")[0]; // Apollo cache keys include arguments.
        const child = value[key];
        if (field === "adBusinesses" && child && typeof child === "object") {
            child.items = [];
            if ("total" in child) child.total = 0;
        } else if (
            ["bookingBanners", "mapsCmsMyHomeBanners", "houseBanners"].includes(
                field,
            )
        ) {
            value[key] = [];
        } else if (
            ["textHouseBanner", "savelistBanner", "brandPromotion"].includes(
                field,
            )
        ) {
            value[key] = null;
        } else if (isAd(child)) {
            delete value[key];
        } else {
            value[key] = clean(child);
        }
    }
    return value;
}

// Read only JSON literals, never execute scripts from a page.
function rewriteLiteral(body: string, pattern: RegExp): string {
    return body.replace(pattern, (match, prefix: string, literal: string) => {
        try {
            return (
                prefix +
                JSON.stringify(clean(JSON.parse(literal))).replace(
                    /</g,
                    "\\u003c",
                )
            );
        } catch {
            return match;
        }
    });
}

function cleanHtml(body: string): string {
    body = rewriteLiteral(
        body,
        /(window\.__APOLLO_STATE__\s*=\s*)(\{[\s\S]*?\})(?=;\s*window\.__PLACE_STATE__\s*=)/g,
    );
    // This list also supplies native map markers through MapsJsBridge.
    body = rewriteLiteral(
        body,
        /(\bvar list\s*=\s*)(\[[\s\S]*?\])(?=;?\s*var options\s*=)/g,
    );
    // Track nesting so a sponsored row containing lists is removed completely.
    const stack: { start: number; ad: boolean }[] = [];
    const ranges: [number, number][] = [];
    for (const tag of body.matchAll(
        /<\/?li\b[^>]*>|n_ad_group_type|data-nlog-area="[^"]*\.adinfo"/gi,
    )) {
        if (tag[0][0] !== "<") {
            if (stack.length) stack[stack.length - 1].ad = true;
            continue;
        }
        if (tag[0][1] !== "/") {
            stack.push({ start: tag.index, ad: false });
            continue;
        }
        const row = stack.pop();
        if (!row?.ad) continue;
        const start = row.start;
        const end = tag.index + tag[0].length;
        // An outer sponsored row subsumes any nested ranges.
        while (ranges.length && ranges[ranges.length - 1][0] >= start)
            ranges.pop();
        ranges.push([start, end]);
    }
    let cursor = 0;
    const parts = ranges.map(([start, end]) => {
        const part = body.slice(cursor, start);
        cursor = end;
        return part;
    });
    parts.push(body.slice(cursor));
    return parts.join("");
}

function main(): void {
    const body = $response.body;
    if (!body) return $done({});
    try {
        let output: string;
        const path = $request.url.split("?")[0];
        if (/^https:\/\/nmap\.place\.naver\.com\//.test(path)) {
            output = cleanHtml(body);
        } else {
            const value = JSON.parse(body);
            if (path.endsWith("/maps-event-popup/popups")) {
                value.eventModal = null;
                value.eventNormalPopups = [];
                value.eventPagePopups = [];
                value.eventModalPopups = [];
            } else if (
                /\/components\/saveList-marketing-/.test(path) ||
                path.endsWith("/ads/brand-marker")
            ) {
                value.items = [];
            } else if (path.endsWith("/maps-app/props")) {
                if (value.naviSpotifyBanner)
                    value.naviSpotifyBanner.active = false;
                if (value.naviSpotify?.banner)
                    value.naviSpotify.banner.active = false;
                if (value.setting?.gscaltexPlusMembership)
                    value.setting.gscaltexPlusMembership.active = false;
                if (value.setting) {
                    value.setting.adMarkerReleaseRate = 0;
                    for (const key of [
                        "launcherTooltip",
                        "homeTabTooltip",
                        "searchBarTooltip",
                    ]) {
                        if (value.setting[key])
                            value.setting[key].isActive = false;
                    }
                }
                if (value.discoveryTooltip)
                    value.discoveryTooltip.isActive = false;
                if (value.naviScoreTooltip?.insuranceOpen)
                    value.naviScoreTooltip.insuranceOpen.active = false;
            } else if (
                path.endsWith("/bubble-keywords") &&
                Array.isArray(value.result?.bubbleKeywords)
            ) {
                value.result.bubbleKeywords =
                    value.result.bubbleKeywords.filter(
                        (item: any) =>
                            !/^https:\/\/travel\.naver\.co\.kr\/welcomekorea\//.test(
                                item.url ?? "",
                            ),
                    );
            }
            output = JSON.stringify(clean(value));
        }
        $done(output === body ? {} : { body: output });
    } catch {
        $done({});
    }
}

main();
