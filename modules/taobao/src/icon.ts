function unlockIcon(): void {
    const body = $response.body;
    if (
        !body ||
        !/^https:\/\/g\.alicdn\.com\/code\/npm\/@ali\/tb-vip-vip-snap-webapp\/[\d.]+\/js\/p_app-icon-setting-(?:index|mods-main-index)\.js(?:\?|$)/.test(
            $request.url,
        )
    )
        return $done({});

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
