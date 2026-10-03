function clearKeys(platform: Platform | undefined, expected: unknown) {
    if (platform === undefined || expected === undefined) return;
    const config = readConfig();
    if (!Object.hasOwn(config, platform)) return;
    const current = config[platform] as StoredKeys | undefined;
    const snapshot = expected as StoredKeys | undefined;
    if (
        JSON.stringify([current?.clientKey, current?.encryptKey]) ===
        JSON.stringify([snapshot?.clientKey, snapshot?.encryptKey])
    ) {
        delete config[platform];
        return writeConfig(config);
    }
}
