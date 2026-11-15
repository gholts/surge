const promotionCodes = new Set([
    "home_navigation_atmosphere",
    "homepage_redpackage_use_banner_v1",
    "home_float_redpacket_v1",
    "top_magnetic_template",
    "frontend_magnetic_template",
    "home_secondFloor_guide_template",
    "suspension_template",
]);
const liteHome = typeof $argument !== "undefined" && $argument === "true";

function isAdFlag(value: unknown): boolean {
    return value === true || value === "true" || value === 1 || value === "1";
}

function isSponsored(item: any, templates: any): boolean {
    const fields = item?.fields;
    const restaurant = fields?.restaurant;
    return (
        /^(?:mat_ad[_-]|ele_eat_uni_ad_|banner$)/.test(item?.bizCode ?? "") ||
        /^(?:mat_ad[_-]|ele_eat_uni_ad_|banner$)/.test(
            templates?.[item?.templateId]?.name ?? "",
        ) ||
        fields?.cardType === "banner" ||
        [
            restaurant?.recommend?.isAd,
            restaurant?.adShopExt?.isAd,
            restaurant?.adInfo?.isAd,
        ].some(isAdFlag)
    );
}

function main(): void {
    const body = $response.body;
    if (!body) return $done({});
    try {
        const value = JSON.parse(body);
        if (
            !Array.isArray(value?.ret) ||
            !value.ret.length ||
            !value.ret.every(
                (status: unknown) =>
                    typeof status === "string" &&
                    status.startsWith("SUCCESS::"),
            )
        )
            return $done({});

        const data = value.data;
        let changed = false;
        if (
            /\/mtop\.alsc\.eleme\.trigger\.opportunity\.query\/1\.0\/?(?:\?|$)/.test(
                $request.url,
            )
        ) {
            const opportunities = data?.data?.opportunities;
            if (Array.isArray(opportunities)) {
                data.data.opportunities = opportunities.filter(
                    (item: any) =>
                        !(
                            (item?.bizGroupCode === "NEW_RETAIL" &&
                                ["newretail", "back_intercept"].includes(
                                    item.action,
                                )) ||
                            (item?.bizGroupCode === "LUCP_CEP_Trigger" &&
                                ["push", "trigger"].includes(item.action))
                        ),
                );
                changed =
                    data.data.opportunities.length !== opportunities.length;
            }
        } else if (
            /\/mtop\.alsc\.eleme\.miniapp\.homepagev1(?:\.meishi)?\/1\.0\/?(?:\?|$)/.test(
                $request.url,
            )
        ) {
            for (const code of promotionCodes) {
                if (data?.data && Object.hasOwn(data.data, code)) {
                    delete data.data[code];
                    changed = true;
                }
            }
            if (Array.isArray(data?.structure?.root)) {
                const nodes = data.structure.root;
                data.structure.root = nodes.filter(
                    (node: any) => !promotionCodes.has(node?.code),
                );
                changed ||= data.structure.root.length !== nodes.length;
            }

            const feed = data?.data?.frontend_page_shop_list_recommend;
            const fields = feed?.fields;
            if (Array.isArray(fields?.items)) {
                const items = fields.items;
                fields.items = items.filter(
                    (item: any) => !isSponsored(item, data.template),
                );
                // Server pagination includes filtered ads.
                changed ||= fields.items.length !== items.length;
            }
            if (
                liteHome &&
                feed?.customized?.feedUiData?.specialEffectSwitch === true
            ) {
                feed.customized.feedUiData.specialEffectSwitch = false;
                changed = true;
            }
        }
        $done(changed ? { body: JSON.stringify(value) } : {});
    } catch {
        $done({});
    }
}

main();
