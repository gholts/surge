function hideCartBanners(): void {
    const body = $response.body;
    if (typeof body !== "string") return $done({});
    // Source counterpart of the captured 1.255.0 WLM. Override its renderer
    // registry so inline styles and native CSS parsing cannot reveal ads.
    const boundary = "};var Ab=wb;";
    if (
        !/^https:\/\/g\.alicdn\.com\/mtb\/icart\/1\.255\.0\/weex\/cart\.js(?:\?|$)/.test(
            $request.url,
        ) ||
        !body.includes("'use weex:v2:ice'") ||
        !body.includes("const wb={") ||
        body.split(boundary).length !== 2 ||
        !body.includes("dinamicx$icart_top_banner$0$mixcart:") ||
        !body.includes("dinamicx$icart_bundle_promotion$0$mixcart:") ||
        !body.includes("dinamicx$icart_promotion$0$mixcart:")
    )
        return $done({});
    const filter =
        '(function(r){function text(v,d){if(typeof v==="string")return v;if(!v||d>4)return"";' +
        'if(Array.isArray(v))return v.map(function(x){return text(x,d+1)}).join("");' +
        'return["title","text","richTitle","richText","subTitle","content","couponButton"].map(function(k){return text(v[k],d+1)}).join("")}' +
        'r["dinamicx$icart_top_banner$0$mixcart"]=function(){return null};' +
        '["dinamicx$icart_bundle_promotion$0$mixcart","dinamicx$icart_promotion$0$mixcart"].forEach(function(k){var original=r[k];' +
        'r[k]=function(p){return/(?:开(?:通)?88VIP|开卡领|88VIP开卡|立即开通)/i.test(text(p.fields,0).replace(/\\s+/g,""))?null:(0,l.jsx)(original,p)}})})(wb);';
    const headers = Object.fromEntries(
        Object.entries($response.headers ?? {}).filter(
            ([key]) =>
                !/^(?:content-md5|etag|x-oss-hash-crc64ecma|cache-control)$/i.test(
                    key,
                ),
        ),
    );
    headers["Cache-Control"] = "no-store";
    $done({
        body: body.replace(boundary, "};" + filter + "var Ab=wb;"),
        headers,
    });
}
hideCartBanners();
