function record(value: any): value is Record<string, any> {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

function displayText(value: any, depth = 0): string {
    if (typeof value === "string") return value;
    if (depth > 3 || !value || typeof value !== "object") return "";
    if (Array.isArray(value))
        return value.map((item) => displayText(item, depth + 1)).join("");
    return [
        "title",
        "subTitle",
        "subtitle",
        "text",
        "desc",
        "description",
        "richTitle",
        "richText",
        "content",
        "buttonText",
        "buttonTitle",
        "tips",
        "textList",
        "data",
        "props",
        "material",
        "button",
    ]
        .map((key) => displayText(value[key], depth + 1))
        .join(" ");
}

function transactional(value: any, key = ""): boolean {
    if (!record(value)) return false;
    const fields = record(value.fields) ? value.fields : value;
    return (
        Boolean(fields.itemId || fields.skuId || fields.orderId) ||
        /(?:^|[\s$])(?:(?:sc|icart)_)?(?:item|sku|order|submit|pay|address)(?:[_$\s]|$)/i.test(
            [key, value.tag, value.type]
                .filter((v) => typeof v === "string")
                .join(" "),
        )
    );
}

function isPromotion(value: any, key = "", automatic = false): boolean {
    if (!record(value)) return false;
    const fields = record(value.fields) ? value.fields : value;
    const identity = [
        key,
        value.tag,
        value.type,
        value.componentType,
        value.templateName,
    ]
        .filter((item) => typeof item === "string")
        .join(" ");
    // Product, SKU, order and checkout records are never classified by ad copy.
    if (transactional(value, key)) return false;
    if (
        automatic &&
        /(?:^|[\s$])(?:popup|popLayer|floatBar|floatingWindow)(?:[_$\s]|$)/i.test(
            identity,
        )
    )
        return true;
    if (
        /(?:^|[\s$])(?:topAdBanner|adBanner|icart_top_banner|super88|vipBanner|blackVipBanner|marketingPopup|marketingPop|couponFloat|floatBanner)(?:[_$\s]|$)/i.test(
            identity,
        )
    )
        return true;
    const text = displayText(fields).replace(/\s+/g, "");
    return /(?:开通\s*88\s*VIP|开卡领|外卖红包未使用|苹果加补券|超级88|您多笔订单可用消费券|消费券[,，]?开卡)/i.test(
        text,
    );
}

function isVideoTab(value: any): boolean {
    if (typeof value === "string")
        return /^(?:视频|逛逛|guangguang|video|tab2)$/i.test(value);
    if (!record(value)) return false;
    const fields = record(value.fields) ? value.fields : value;
    const labels = [
        fields.title,
        fields.name,
        fields.text,
        fields.label,
        fields.tabName,
    ];
    const ids = [
        fields.biz,
        fields.bizCode,
        fields.bizId,
        fields.tabId,
        fields.id,
        fields.key,
    ];
    const urls = [fields.url, fields.targetUrl, fields.link, fields.schema];
    return (
        labels.some((v) => v === "视频" || v === "逛逛") ||
        ids.some(
            (v) =>
                typeof v === "string" &&
                /^(?:guangguang|video|tab2|TBTabBarBizGuangGuang)$/i.test(v),
        ) ||
        urls.some(
            (v) =>
                typeof v === "string" &&
                /\/mtb-guang\/tab2-video-flow\//.test(v),
        )
    );
}

function mainTabs(value: any[]): boolean {
    const labels = value.map((item) => {
        if (typeof item === "string") return item;
        const fields = item?.fields ?? item;
        return fields?.title ?? fields?.text ?? fields?.name ?? fields?.label;
    });
    return (
        labels.includes("购物车") &&
        labels.some((v) => v === "我的淘宝" || v === "首页")
    );
}

function cleanNative(
    value: any,
    navigation = false,
    depth = 0,
    automatic = false,
): boolean {
    if (!value || typeof value !== "object" || depth > 64) return false;
    if (transactional(value)) return false;
    let changed = false;
    // Captured icart data contract: data[keyname] + hierarchy.structure IDs.
    if (record(value.data) && record(value.hierarchy?.structure)) {
        const removed = new Set<string>();
        for (const [id, component] of Object.entries(value.data)) {
            if (
                id !== value.hierarchy.root &&
                isPromotion(component, id, automatic)
            ) {
                removed.add(id);
                delete value.data[id];
            }
        }
        if (removed.size) {
            changed = true;
            for (const [id, children] of Object.entries(
                value.hierarchy.structure,
            )) {
                if (removed.has(id)) delete value.hierarchy.structure[id];
                else if (Array.isArray(children))
                    value.hierarchy.structure[id] = children.filter(
                        (child) => !removed.has(child),
                    );
            }
        }
    }
    for (const key of Object.keys(value)) {
        const child = value[key];
        const nav =
            navigation ||
            /^(?:tabbar|tabBarItems|tabbarList|tabbarConfig|bottomTabs|bottomTabList|bottomTabBar|bottomNavigation|bottomBar|bottomBarItems)$/i.test(
                key,
            );
        // Home/profile popup slots are automatic overlays. Clear the slot even
        // when its copy is baked into an image instead of supplied as text.
        if (
            automatic &&
            /^(?:pop(?:up|layer)(?:data|info|model|list|window)?|popData|popInfo|popWindow|floatBar|floatingWindow)$/i.test(
                key,
            ) &&
            child &&
            typeof child === "object"
        ) {
            delete value[key];
            changed = true;
            continue;
        }
        if (Array.isArray(child)) {
            // A mixed UI list has explicit components or visible tab labels.
            const tabs = nav || mainTabs(child);
            const filtered = child.filter(
                (item) =>
                    !(tabs
                        ? isVideoTab(item)
                        : isPromotion(item, "", automatic)),
            );
            if (filtered.length !== child.length) {
                value[key] = filtered;
                changed = true;
            }
            for (const item of filtered)
                changed =
                    cleanNative(item, tabs, depth + 1, automatic) || changed;
        } else if (record(child)) {
            if (
                (nav && isVideoTab(child)) ||
                ((/^(?:pop(?:up|layer)?(?:window|info|data|model)?|float(?:ing)?(?:bar|banner|window)?|bottomBanner|vipBanner|super88|adBanner|topAdBanner|marketingPopup)(?:_\d+)?$/i.test(
                    key,
                ) ||
                    (record(child.fields) &&
                        (child.type || child.tag || child.componentType))) &&
                    isPromotion(child, key, automatic))
            ) {
                delete value[key];
                changed = true;
            } else
                changed =
                    cleanNative(child, nav, depth + 1, automatic) || changed;
        } else if (
            typeof child === "string" &&
            /^(?:value|data|apiStack|result|payload)$/.test(key) &&
            /^[\s]*[\[{]/.test(child)
        ) {
            try {
                const decoded = JSON.parse(child);
                if (cleanNative(decoded, nav, depth + 1, automatic)) {
                    value[key] = JSON.stringify(decoded);
                    changed = true;
                }
            } catch {}
        }
    }
    return changed;
}

function nativeResponse(): void {
    const body = $response.body;
    if (
        typeof body !== "string" ||
        !body ||
        !/\/(?:gw|h5)\/mtop\.(?:taobao\.(?:wireless\.home\.|mclaren\.|ferrari\.homepage\.|detail\.|poplayer\.)|trade\.(?:query\.?bag|update\.bag|update\.structure)\/)/i.test(
            $request.url,
        )
    )
        return $done({});
    try {
        const jsonp = body.match(/^\s*([\w$.]+\()([\s\S]*)(\);?\s*)$/);
        const data = JSON.parse(jsonp ? jsonp[2] : body);
        if (!record(data) || !record(data.data)) return $done({});
        if (
            Array.isArray(data.ret) &&
            !data.ret.some(
                (v: any) => typeof v === "string" && v.startsWith("SUCCESS"),
            )
        )
            return $done({});
        const api = typeof data.api === "string" ? data.api : $request.url;
        const automatic =
            /mtop\.taobao\.(?:wireless\.home\.|mclaren\.|ferrari\.homepage\.|poplayer\.)/i.test(
                api,
            );
        if (!cleanNative(data.data, false, 0, automatic)) return $done({});
        const output = JSON.stringify(data);
        $done({ body: jsonp ? jsonp[1] + output + jsonp[3] : output });
    } catch {
        $done({});
    }
}
nativeResponse();
