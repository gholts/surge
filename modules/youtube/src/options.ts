function readOptions(defaults: Options = {}): Options {
    return typeof $argument === "string" && !$argument.includes("{{{")
        ? { ...defaults, ...(JSON.parse($argument) as Options) }
        : defaults;
}
