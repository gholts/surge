// Suppress outgoing typing only. No message bodies, uploads, or persistent state.
(() => {
    try {
        const match =
            /^https:\/\/discord\.com\/api\/v[0-9]+\/channels\/([0-9]+)\/typing(?:\?.*)?$/.exec(
                $request.url,
            );
        if (
            !match ||
            $request.method !== "POST" ||
            typeof $response !== "undefined"
        )
            return $done({});
        const args = Object.fromEntries(
            String(typeof $argument === "undefined" ? "" : $argument)
                .split("&")
                .map((item) => item.split("=")),
        );
        if (args.typing !== "true") return $done({});
        const except = (args.except || "")
            .split("|")
            .map((id) => id.trim())
            .includes(match[1]);
        const hidden = args.hide !== "false" ? !except : except;
        $done(hidden ? { response: { status: 204 } } : {});
    } catch {
        $done({});
    }
})();
