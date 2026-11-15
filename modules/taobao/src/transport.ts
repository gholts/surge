function useHttps(): void {
    const dispatch =
        /^http:\/\/(?:amdc\.m\.taobao\.com|(?:\d{1,3}\.){3}\d{1,3})\/amdc\/mobileDispatch(?:\?|$)/.test(
            $request.url,
        );
    const nativeApi =
        /\/(?:gw|h5)\/mtop\.(?:taobao\.(?:wireless\.home\.|mclaren\.|ferrari\.homepage\.|detail\.|poplayer\.)|trade\.(?:query\.?bag|update\.bag|update\.structure)\/)/i.test(
            $request.url,
        );
    if (!dispatch && !nativeApi) return $done({});
    try {
        const headers = $request.headers ?? {};
        const agent = Object.entries(headers).find(
            ([key]) => key.toLowerCase() === "user-agent",
        )?.[1];
        if (
            !agent ||
            !/(?:AliApp\(TB|淘宝|手机淘宝|Taobao4iPhone)\//i.test(
                decodeURIComponent(agent),
            )
        )
            return $done({});

        if (typeof $response === "undefined") {
            // Surge cannot decode AMDC dictionaries; request standard compression.
            const output = Object.fromEntries(
                Object.entries(headers).filter(
                    ([key]) =>
                        !/^(?:accept-encoding|sec-available-dictionary)$/i.test(
                            key,
                        ),
                ),
            );
            output["Accept-Encoding"] = "gzip";
            return $done({ headers: output });
        }
        if (!dispatch || typeof $response.body !== "string" || !$response.body)
            return $done({});
        const body = $response.body.trim();
        const encoded = !body.startsWith("{");
        const data = JSON.parse(
            encoded
                ? new TextDecoder().decode(
                      Uint8Array.from(atob(body), (char) => char.charCodeAt(0)),
                  )
                : body,
        );
        if (!Array.isArray(data.dns)) return $done({});
        let changed = false;
        for (const record of data.dns) {
            if (
                !/^(?:acs|guide-acs|trade-acs)\.m\.taobao\.com$/.test(
                    record?.host ?? "",
                ) ||
                !Array.isArray(record.servers)
            )
                continue;
            for (const server of record.servers) {
                if (!Array.isArray(server?.channels)) continue;
                for (const channel of server.channels) {
                    const attributes = channel?.attributes;
                    if (
                        !Array.isArray(attributes) ||
                        !attributes.some((item: any) =>
                            /^(?:http3(?:plain)?|http2|spdy)$/.test(
                                item?.protocol ?? "",
                            ),
                        )
                    )
                        continue;
                    // HTTPS needs no Alibaba public key; keep addresses and timeouts.
                    const { publickey, rtt, ...attribute } = attributes[0];
                    channel.attributes = [
                        {
                            ...attribute,
                            protocol: "https",
                            port: 443,
                            heartbeat: 0,
                        },
                    ];
                    delete server.proxies;
                    changed = true;
                }
            }
        }
        if (!changed) return $done({});
        let output = JSON.stringify(data);
        if (encoded) {
            let binary = "";
            for (const byte of new TextEncoder().encode(output))
                binary += String.fromCharCode(byte);
            output = btoa(binary);
        }
        $done({ body: output });
    } catch {
        $done({});
    }
}
useHttps();
