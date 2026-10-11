const fieldSpecs: Partial<Record<MessageType, Map<number, FieldSpec>>> =
    Object.create(null);
const wireState = Symbol("wireState");
function markChanged(state: WireState | undefined, name: string) {
    while (state) {
        (state.changed ??= new Set<string>()).add(name);
        name = state.parentName!;
        state = state.parent;
    }
}
function readField(
    field: WireField,
    depth: number,
    state: WireState,
): ProtoValue {
    const [, name, kind] = field.spec!;
    return kind === "bytes"
        ? field.data
        : kind === "string"
          ? utf8.decode(field.data)
          : kind === "bool"
            ? numberValue(field.data) !== 0
            : kind === "uint"
              ? numberValue(field.data)
              : decodeMessage(
                    kind as MessageType,
                    field.data,
                    depth + 1,
                    state,
                    name,
                );
}
function decodeMessage(
    type: MessageType,
    bytes: Uint8Array,
    depth = 0,
    parent?: WireState,
    parentName?: string,
): ProtoNode {
    if (depth > 64) throw new Error("Protobuf nesting limit");
    const message: ProtoNode = {},
        fields = wireFields(bytes);
    const counts = fields.length > 1 ? new Map<string, number>() : null;
    const state: WireState = { bytes, fields, parent, parentName };
    const specs = (fieldSpecs[type] ??= new Map(
        schema[type].map((spec) => [spec[0], spec]),
    ));
    Object.defineProperty(message, wireState, { value: state });
    for (const [, name, , repeated] of schema[type])
        if (repeated) message[name] = [];
    if (counts)
        for (const field of fields) {
            const spec = specs.get(field.no);
            if (
                !spec ||
                field.wire !==
                    (spec[2] === "bool" || spec[2] === "uint" ? 0 : 2)
            )
                continue;
            field.spec = spec;
            if (!spec[3]) counts.set(spec[1], (counts.get(spec[1]) ?? 0) + 1);
        }
    let lazyNames: Set<string> | undefined;
    for (const field of fields) {
        const spec = counts ? field.spec : specs.get(field.no);
        if (
            !spec ||
            field.wire !== (spec[2] === "bool" || spec[2] === "uint" ? 0 : 2)
        )
            continue;
        field.spec = spec;
        const [, name, kind, repeated] = spec;
        if (!repeated && (counts?.get(name) ?? 0) > 1) {
            delete field.spec;
            continue;
        }
        // Normal content stays eager; only present optional branches get a getter.
        if ((schema as Schema)[kind] && !contentTypes.has(kind)) {
            if (lazyNames?.has(name)) continue;
            (lazyNames ??= new Set<string>()).add(name);
            const records = fields.filter(
                (candidate) => candidate.spec?.[1] === name,
            );
            state.type = type;
            state.deferred = true;
            Object.defineProperty(message, name, {
                enumerable: true,
                configurable: true,
                get() {
                    const value = repeated
                        ? records.map((record) =>
                              readField(record, depth, state),
                          )
                        : readField(records[0], depth, state);
                    Object.defineProperty(message, name, {
                        value,
                        enumerable: true,
                        writable: true,
                        configurable: true,
                    });
                    return value;
                },
            });
        } else {
            const value = readField(field, depth, state);
            if (repeated) (message[name] as ProtoValue[]).push(value);
            else message[name] = value;
        }
    }
    return message;
}
function setField<M extends ProtoNode, K extends keyof M & string>(
    message: M,
    name: K,
    value: M[K],
) {
    const previous = message[name];
    const same =
        Array.isArray(previous) && Array.isArray(value)
            ? previous.length === value.length &&
              previous.every((item, i) => item === value[i])
            : previous === value;
    if (same) return false;
    message[name] = value;
    if (message[wireState]) markChanged(message[wireState], name);
    return true;
}
function encodeField(spec: FieldSpec, value: ProtoValue) {
    const [no, , kind] = spec,
        wire = kind === "bool" || kind === "uint" ? 0 : 2;
    const data =
        kind === "bytes"
            ? (value as Uint8Array)
            : kind === "string"
              ? textEncoder.encode(value as string)
              : kind === "bool"
                ? varint(value ? 1 : 0)
                : kind === "uint"
                  ? varint(value as number)
                  : encodeMessage(kind as MessageType, value as ProtoNode);
    return concatBytes(
        wire === 2
            ? [varint(no * 8 + wire), varint(data.length), data]
            : [varint(no * 8), data],
    );
}
function encodeMessage(type: MessageType, message: ProtoNode) {
    const state = message[wireState];
    if (state && !state.changed) return state.bytes;
    // Repeated edits filter existing values or append new ones; survivors keep wire order.
    const chunks: Uint8Array[] = [],
        remaining = new Map<string, Map<ProtoValue, ProtoValue>>(),
        handled = new Set<string>();
    const identity = (value: ProtoValue, kind: string) =>
        (schema as Schema)[kind]
            ? ((value as ProtoNode)[wireState]?.bytes ?? value)
            : value;
    function values(spec: FieldSpec): ProtoValue[] {
        const [, name, , repeated] = spec;
        return repeated
            ? ((message[name] as ProtoValue[]) ?? [])
            : message[name] === undefined
              ? []
              : [message[name]];
    }
    for (const spec of schema[type]) {
        const [, name, kind, repeated] = spec;
        if (!repeated || !state?.changed?.has(name)) continue;
        remaining.set(
            name,
            new Map(
                values(spec).map((value) => [identity(value, kind), value]),
            ),
        );
    }
    for (const field of state?.fields ?? []) {
        if (!field.spec || !state!.changed!.has(field.spec[1])) {
            chunks.push(field.raw);
            continue;
        }
        const [, name, kind, repeated] = field.spec;
        handled.add(name);
        if (repeated) {
            const pending = remaining.get(name)!;
            if (!pending.has(field.data)) continue;
            const value = pending.get(field.data)!;
            pending.delete(field.data);
            chunks.push(
                !(schema as Schema)[kind] ||
                    !(value as ProtoNode)[wireState]?.changed
                    ? field.raw
                    : encodeField(field.spec, value),
            );
        } else {
            const value = message[name];
            if (value !== undefined)
                chunks.push(
                    identity(value, kind) === field.data &&
                        (!(schema as Schema)[kind] ||
                            !(value as ProtoNode)[wireState]?.changed)
                        ? field.raw
                        : encodeField(field.spec, value),
                );
        }
    }
    for (const spec of schema[type]) {
        const [, name, , repeated] = spec;
        if (state && !state.changed!.has(name)) continue;
        if (repeated && remaining.has(name)) {
            for (const value of remaining.get(name)!.values())
                chunks.push(encodeField(spec, value));
        } else if (!handled.has(name))
            for (const value of values(spec))
                chunks.push(encodeField(spec, value));
    }
    const output = concatBytes(chunks);
    return state && sameBytes(output, state.bytes) ? state.bytes : output;
}
function codec<T extends MessageType>(type: T) {
    return {
        fromBinary: (bytes: Uint8Array) =>
            decodeMessage(type, bytes) as Message<T>,
        toBinary: (message: Message<T>) => encodeMessage(type, message),
    };
}
const EMPTY_FIELDS: WireField[] = [];
function unknownFields(message: ProtoNode): WireField[] {
    const state = message[wireState];
    if (!state) return EMPTY_FIELDS;
    if (state.unknown) return state.unknown;
    if (
        !state.fields.length ||
        (state.fields.length === 1 && state.fields[0].spec)
    )
        return EMPTY_FIELDS;
    let unknown: WireField[] | undefined;
    for (const field of state.fields)
        if (!field.spec) (unknown ??= []).push(field);
    return (state.unknown = unknown ?? EMPTY_FIELDS);
}

// Patch a verified opaque field without teaching the content walker its schema.
function rewriteUnknownField(
    message: ProtoNode,
    no: number,
    transform: (bytes: Uint8Array) => Uint8Array | undefined,
) {
    let edits: { field: WireField; data: Uint8Array | undefined }[] | undefined;
    for (const field of unknownFields(message)) {
        if (field.no !== no || field.wire !== 2) continue;
        const data = transform(field.data);
        if (data && sameBytes(data, field.data)) continue;
        (edits ??= []).push({ field, data });
    }
    if (!edits) return false;
    const state = message[wireState]!;
    for (const { field, data } of edits) {
        if (data) {
            field.data = data;
            field.raw = encodeField([no, "", "bytes"], data);
        } else {
            state.fields.splice(state.fields.indexOf(field), 1);
        }
    }
    state.unknown = undefined;
    // No declared field changed here; ancestors still use parentName.
    markChanged(state, "");
    return true;
}

// Edit a declared binary path; keep all siblings and repeated occurrences.
function rewriteBinaryPath(
    bytes: Uint8Array,
    path: number[],
    transform: (bytes: Uint8Array) => Uint8Array,
): Uint8Array {
    if (!path.length) return transform(bytes);
    let changed = false;
    const chunks = wireFields(bytes).map((field) => {
        if (field.no !== path[0] || field.wire !== 2) return field.raw;
        const data = rewriteBinaryPath(field.data, path.slice(1), transform);
        if (sameBytes(data, field.data)) return field.raw;
        changed = true;
        return encodeField([field.no, "", "bytes"], data);
    });
    return changed ? concatBytes(chunks) : bytes;
}
