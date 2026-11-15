function unlockIcon(): void {
    const body = $response.body;
    if (
        !body ||
        !/^https:\/\/g\.alicdn\.com\/code\/npm\/@ali\/tb-vip-vip-snap-webapp\/[\d.]+\/js\/p_app-icon-setting-(?:index|mods-main-index)\.js(?:\?|$)/.test(
            $request.url,
        )
    )
        return $done({});

    // Captured icon-page bundle only. Keep device support checks and the native
    // setIcon call intact; this does not change account membership or benefits.
    const gate =
        /function\(\)\{return ([\w$]+)\?\(0,[\w$]+\.[\w$]+\)\(\1\.blackVip\)\?([\w$]+)\.SELECTED:Number\(\1\.taoScore\)<1e3\?\2\.NEED_TAO_SCORE:\2\.NEED_OPEN_CARD:\2\.HIDDEN\}/g;
    const reset = /\b[\w$]+\.needAutoSet(?=,)/g;
    // Unknown bundles pass through. Never guess at a different entitlement gate.
    if (body.match(gate)?.length !== 1 || body.match(reset)?.length !== 1)
        return $done({});
    $done({
        body: body
            .replace(gate, "function(){return $2.SELECTED}")
            .replace(reset, "!1"),
    });
}
unlockIcon();
