function closeVipPopup(): void {
    const body = $response.body;
    if (
        typeof body !== "string" ||
        !/^https:\/\/g\.alicdn\.com\/code\/npm\/@ali\/pegasus-project-dragon-stable\/[\d.]+\/js\/p_poplayer-index\.js(?:\?|$)/.test(
            $request.url,
        )
    )
        return $done({});

    // Captured 2.5.0 route and its own native close helper. Keep other routes and
    // full membership pages intact; this wrapper handles the floating popup only.
    const entry =
        "64241:function(e,t,n){n.r(t),n.d(t,{default:function(){return Me},pageConfig:function(){return De}});";
    if (
        body.split(entry).length !== 2 ||
        !body.includes("I=n(85917)") ||
        !body.includes("O=n(84419)") ||
        !body.includes('cType:"StdPop.close"')
    )
        return $done({});
    const wrapper =
        'function __tbCleanPopup(){var q=typeof location!=="undefined"?new URLSearchParams(location.search):null;' +
        'var active=q&&location.pathname==="/wow/z/pop-vip/float/uni-poplayer"&&q.get("popId");' +
        '(0,O.useEffect)(function(){if(active){(0,I.A)();Promise.resolve((0,I.v)({popId:q.get("popId"),source:q.get("source"),bizScope:q.get("bizScope")})).catch(function(){})}},[]);' +
        "return active?null:(0,r.tZ)(Me,{})}";
    $done({
        body: body.replace(
            entry,
            "64241:function(e,t,n){" +
                wrapper +
                "n.r(t),n.d(t,{default:function(){return __tbCleanPopup},pageConfig:function(){return De}});",
        ),
    });
}
closeVipPopup();
