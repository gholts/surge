function skipRateLimit(): void {
    const body = $response.body;
    if (
        typeof body !== "string" ||
        !body ||
        !/^https:\/\/g\.alicdn\.com\/bsop-static\/sufei-punish\/[\d.]+\/build\/punishpage\.min\.js(?:\?|$)/.test(
            $request.url,
        )
    )
        return $done({});

    const render =
        'key:"render",value:function(){var e=this,t=this.props,n=t.languageConfig';
    if (
        body.split(render).length !== 2 ||
        !body.includes("isMobile:_.isMobile,uuidOrigin:this.getUUIDValue()") ||
        !body.includes('(0,a.getNativeCloseUrl)()+"?close=true"')
    )
        return $done({});

    // Native cancel only; keep verification, login and upgrade flows intact.
    const cancel =
        "if(/AliApp\\(TB\\//.test(navigator.userAgent)&&_.isInNativeSdk&&" +
        "/^(deny|wait)$/.test(this.props.action)&&!this.props.appUpgrade&&" +
        '!this.props.cdc){location.replace((0,_.getNativeCloseUrl)()+"?close=true");return}';
    $done({
        body: body.replace(
            render,
            'key:"render",value:function(){' +
                cancel +
                "var e=this,t=this.props,n=t.languageConfig",
        ),
    });
}
skipRateLimit();
