type Route = {
    [T in MessageType]: readonly [
        T,
        (message: Message<T>, options: Options) => boolean,
    ];
}[MessageType];
const ROUTES = {
    "navigation/resolve_url": ["ResolveUrl", transformNavigation],
    browse: ["Browse", transformContent],
    next: ["Next", transformContent],
    player: ["Player", transformPlayer],
    search: ["Search", transformContent],
    "reel/reel_watch_sequence": ["Shorts", removeShortsAds],
    guide: ["Guide", filterGuide],
    "account/get_setting": ["Setting", addPremiumSettings],
    get_watch: ["Watch", transformWatch],
} as const satisfies Record<string, Route>;
function apiMain() {
    try {
        const endpoint = $request.url.split("?")[0].split("/youtubei/v1/")[1];
        const route =
            Object.hasOwn(ROUTES, endpoint) &&
            (ROUTES as Record<string, Route>)[endpoint];
        if (!route || !$response.body?.length) return $done();
        const [type, transform] = route,
            messageCodec = codec(type);
        const message = messageCodec.fromBinary($response.body);
        const options = readOptions({
            blockUpload: true,
            blockShorts: false,
        });
        if (options.autoHd !== false)
            cacheQuality(responsePlayers(type, message));
        $done(
            transform(message as never, options)
                ? { body: messageCodec.toBinary(message) }
                : undefined,
        );
    } catch (error) {
        console.log("YouTube response: " + error);
        $done();
    }
}
