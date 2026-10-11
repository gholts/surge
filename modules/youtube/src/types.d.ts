type FieldSpec = readonly [number, string, string, true?];
type Schema = Record<string, readonly FieldSpec[]>;
type MessageType = keyof typeof schema;
type Spec<T extends MessageType> = (typeof schema)[T][number];
type FieldValue<S extends FieldSpec> = S[2] extends "bytes"
    ? Uint8Array
    : S[2] extends "string"
      ? string
      : S[2] extends "bool"
        ? boolean
        : S[2] extends "uint"
          ? number
          : S[2] extends MessageType
            ? Message<S[2]>
            : never;
type Message<T extends MessageType> = T extends MessageType
    ? {
          [
              S in Spec<T> as S extends readonly [number, string, string, true]
                  ? S[1]
                  : never
          ]: FieldValue<S>[];
      } & {
          [
              S in Spec<T> as S extends readonly [number, string, string, true]
                  ? never
                  : S[1]
          ]?: FieldValue<S>;
      } & { [wireState]?: WireState }
    : never;
type ProtoValue =
    Uint8Array | string | number | boolean | ProtoNode | ProtoValue[];
type ProtoNode = {
    [name: string]: ProtoValue | undefined;
    [wireState]?: WireState;
};
interface WireField {
    no: number;
    wire: number;
    data: Uint8Array;
    raw: Uint8Array;
    spec?: FieldSpec;
}
interface WireState {
    bytes: Uint8Array;
    fields: WireField[];
    parent?: WireState;
    parentName?: string;
    changed?: Set<string>;
    type?: MessageType;
    deferred?: boolean;
    unknown?: WireField[];
}
interface Options {
    autoHd?: boolean;
    blockUpload?: boolean;
    blockShorts?: boolean;
    blockGames?: boolean;
    blockVerticalLive?: boolean;
    jumpAhead?: boolean;
    blockStore?: boolean;
}
interface QualityRecord {
    height: number;
    itags: number[];
}
interface SelectedQuality {
    height: number;
    formats: Uint8Array[];
}
type Platform = "youtube" | "youtubeMusic";
interface StoredKeys {
    clientKey?: unknown;
    encryptKey?: unknown;
}
interface SurgeRequest {
    url: string;
    method?: string;
    headers?: Record<string, string>;
    body?: Uint8Array | string;
}
interface SurgeResult {
    body?: Uint8Array;
    headers?: Record<string, string>;
    status?: number;
    response?: SurgeResult;
}
declare const $request: SurgeRequest;
declare const $response: {
    body?: Uint8Array;
    status?: number | string;
    headers?: Record<string, string>;
};
declare const $argument: string | undefined;
declare const $persistentStore: {
    read(key: string): string | null;
    write(value: string, key: string): boolean;
};
declare function $done(result?: SurgeResult): void;
declare const textEncoder: TextEncoder;
declare const utf8: TextDecoder;
declare const contentTypes: Set<string>;

type ContentNode = ProtoNode & {
    layoutRender?: Message<"LayoutRender">;
    renderInfo?: Message<"RenderInfo">;
    videoLockup?: Message<"VideoLockup">;
    smartSkipButton?: Message<"SmartSkipButton">;
};
