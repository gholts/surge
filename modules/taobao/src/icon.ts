function unlockIcon(): void {
    const body = $response.body;
    if (
        typeof body !== "string" ||
        !body ||
        !/^https:\/\/(?:g\.alicdn\.com\/code\/npm\/@ali\/tb-vip-vip-snap-webapp\/[\d.]+\/js\/(?:main|p_app-icon-setting-(?:index|mods-main-index))\.js|pages-fast\.m\.taobao\.com\/wow\/z\/app\/tb-vip\/vip-snap-webapp\/app-icon-setting)(?:\?|$)/.test(
            $request.url,
        )
    )
        return $done({});

    // Refresh both the page entry and lazy-loaded component, even when the
    // browser has cached an earlier bundle that still contains the signup gate.
    if (
        /\/app-icon-setting(?:\?|$)|\/js\/main\.js(?:\?|$)/.test($request.url)
    ) {
        const output = body
            .replace(
                /((?:main|p_app-icon-setting-(?:index|mods-main-index))\.js)(["'])/g,
                "$1?tb_clean=3$2",
            )
            .replace(
                /(__webpack_require__\.u=function\([\w$]+\)\{return"js\/"\+\{[^{}]*p_app-icon-setting[^{}]*\}\[[\w$]+\]\+)"\.js"/g,
                '$1".js?tb_clean=3"',
            );
        return $done(output === body ? {} : { body: output });
    }

    // Patch captured UI gate; keep device checks and native setIcon.
    const gate =
        /function\(\)\{return ([\w$]+)\?\(0,[\w$]+\.[\w$]+\)\(\1\.blackVip\)\?([\w$]+)\.SELECTED:Number\(\1\.taoScore\)<1e3\?\2\.NEED_TAO_SCORE:\2\.NEED_OPEN_CARD:\2\.HIDDEN\}/g;
    const reset = /\b[\w$]+\.needAutoSet(?=,)/g;
    if (body.match(gate)?.length !== 1 || body.match(reset)?.length !== 1)
        return $done({});
    $done({
        body: body
            .replace(gate, "function(){return $2.SELECTED}")
            .replace(reset, "!1"),
    });
}
unlockIcon();
