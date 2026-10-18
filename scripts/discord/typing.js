// Suppress outgoing typing only. No message bodies, uploads, or persistent state.
(() => {
    try {
        if (
            $request.method !== "POST" ||
            typeof $response !== "undefined" ||
            !/^https:\/\/discord\.com\/api\/v[0-9]+\/channels\/[0-9]+\/typing(?:\?.*)?$/.test(
                $request.url,
            )
        )
            return $done({});
        $done({ response: { status: 204 } });
    } catch {
        $done({});
    }
})();
