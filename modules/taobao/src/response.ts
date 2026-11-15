function isMarketingPopup(value: any): boolean {
    if (!value || typeof value !== "object") return false;
    const uri = typeof value.uri === "string" ? value.uri : "";
    const url = value.params?.url;
    return (
        value.type === "mamaCommercial" ||
        /^poplayer:\/\/(?:Page_(?:Home|MyTaobao|ShoppingCart|ItemDetail|Message|WuliuXiangQing|SearchDoor|SearchItemList)@(?:popup_|float_|tb_top_float_banner_)|pay_success_page@popup_|tb_shop_marketing_for_)/.test(
            uri,
        ) ||
        /^poplayer:\/\/(?:tb_shop_bottom_hover|tmg_channel_marketing|TBLiveSmartLanding_UniversalPop|tbDesktopLinkGuide|miniAppButtomGuideTips|miniAppBottom2GuideTips|platformNoticeGuideTips|platformNoticeFoldSettingGuide|2020PushRecall|MiniappGameTaskModal|ChattingRedPacketRain|CCRedCoin)$/.test(
            uri,
        ) ||
        (typeof url === "string" &&
            /^https:\/\/(?:pages\.tmall\.com\/wow\/(?:z\/tmtjb\/tjbSSR\/(?:taocoin-benefit-poplayer-2024|wlj-poplayer-(?:activity(?:-(?:nd|h5))?|coin))|hdwk\/act\/(?:wljpop|fissioncouponpop|treefarm-task-pop)|z\/hdwk\/(?:DesktopShortcut\/content-icon-poplayer|2021tmfarm\/(?:wljpop-nd|wljorder-poplayer)|act\/detailbenefitpop|hdsolution2\/(?:wlj-poplayer-game|wljpop-qd)|tmall-farm-game\/floaticon))|market\.m\.taobao\.com\/app\/(?:starlink\/universal-tb-shortcut\/widget-trigger|im\/message-push-pop-v2\/(?:logistic|myexpress|recallsubv2))|pages-fast\.m\.taobao\.com\/wow\/z\/app\/asr-pages\/pentaprism-task-2026\/user-guide|tbshop\.m\.taobao\.com\/app\/tb-shop-team\/(?:shop-isomorphism-ice\/ShopPop|shop-isomorphism\/userLink)|huodong\.m\.taobao\.com\/act\/videoPop\.html)(?:[?#]|$)/.test(
                url,
            ))
    );
}

function cleanPopups(): void {
    if (
        !/^https:\/\/poplayer\.template\.alibaba\.com\/popcdn\/2\/config\.json(?:\?|$)/.test(
            $request.url,
        ) ||
        !$response.body
    )
        return $done({});
    try {
        const data = JSON.parse($response.body);
        if (
            !data?.ac ||
            !data.sc ||
            typeof data.ac !== "object" ||
            typeof data.sc !== "object" ||
            Array.isArray(data.ac) ||
            Array.isArray(data.sc)
        )
            return $done({});
        const removed = new Set<string>();
        for (const id of Object.keys(data.ac)) {
            if (isMarketingPopup(data.ac[id])) {
                delete data.ac[id];
                removed.add(id);
            }
        }
        if (!removed.size) return $done({});
        // Scene lists contain campaign IDs; remove deleted references only.
        for (const scene of Object.keys(data.sc)) {
            const ids = data.sc[scene];
            if (Array.isArray(ids))
                data.sc[scene] = ids.filter((id) => !removed.has(String(id)));
        }
        $done({ body: JSON.stringify(data) });
    } catch {
        $done({});
    }
}
cleanPopups();
