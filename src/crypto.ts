/*
Third-party components bundled below use the MIT License.

@noble/ciphers
Copyright (c) 2022 Paul Miller (https://paulmillr.com)
Copyright (c) 2016 Thomas Pornin <pornin@bolet.org>

@noble/hashes
Copyright (c) 2022 Paul Miller (https://paulmillr.com)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
function createUmpPrimitives() {
    function abytes(
        value: unknown,
        ...lengths: number[]
    ): asserts value is Uint8Array {
        if (!(
            value instanceof Uint8Array ||
            (ArrayBuffer.isView(value) &&
                value.constructor.name === "Uint8Array")
        ))
            throw new Error("Uint8Array expected");
        if (lengths.length && !lengths.includes((value as Uint8Array).length))
            throw new Error(
                "Invalid byte length: " + (value as Uint8Array).length,
            );
    }
    function u32(arr: Uint8Array) {
        return new Uint32Array(
            arr.buffer,
            arr.byteOffset,
            Math.floor(arr.byteLength / 4),
        );
    }
    function clean(...arrays: (Uint8Array | Uint32Array)[]) {
        for (const array of arrays) array.fill(0);
    }
    function isAligned32(bytes: Uint8Array) {
        return bytes.byteOffset % 4 === 0;
    }
    function copyBytes(bytes: Uint8Array) {
        return Uint8Array.from(bytes);
    }
    if (new Uint8Array(new Uint32Array([287454020]).buffer)[0] !== 68)
        throw new Error("Non little-endian hardware is not yet supported");
    var BLOCK_SIZE = 16,
        BLOCK_SIZE32 = 4;
    var POLY = 283;
    function mul2(n: number) {
        return (n << 1) ^ (POLY & -(n >> 7));
    }
    function mul(a: number, b: number) {
        let res = 0;
        for (; b > 0; b >>= 1) ((res ^= a & -(b & 1)), (a = mul2(a)));
        return res;
    }
    var sbox = /* @__PURE__ */ (() => {
        let t = new Uint8Array(256);
        for (let i = 0, x2 = 1; i < 256; i++, x2 ^= mul2(x2)) t[i] = x2;
        let box = new Uint8Array(256);
        box[0] = 99;
        for (let i = 0; i < 255; i++) {
            let x2 = t[255 - i];
            ((x2 |= x2 << 8),
                (box[t[i]] =
                    (x2 ^ (x2 >> 4) ^ (x2 >> 5) ^ (x2 >> 6) ^ (x2 >> 7) ^ 99) &
                    255));
        }
        return (clean(t), box);
    })();
    var rotr32_8 = (n: number) => (n << 24) | (n >>> 8),
        rotl32_8 = (n: number) => (n << 8) | (n >>> 24);
    function genTtable(sbox2: Uint8Array, fn2: (value: number) => number) {
        if (sbox2.length !== 256) throw new Error("Wrong sbox length");
        let T0 = new Uint32Array(256).map((_2, j) => fn2(sbox2[j])),
            T1 = T0.map(rotl32_8),
            T2 = T1.map(rotl32_8),
            T3 = T2.map(rotl32_8),
            T01 = new Uint32Array(256 * 256),
            T23 = new Uint32Array(256 * 256),
            sbox22 = new Uint16Array(256 * 256);
        for (let i = 0; i < 256; i++)
            for (let j = 0; j < 256; j++) {
                let idx = i * 256 + j;
                ((T01[idx] = T0[i] ^ T1[j]),
                    (T23[idx] = T2[i] ^ T3[j]),
                    (sbox22[idx] = (sbox2[i] << 8) | sbox2[j]));
            }
        return { sbox2: sbox22, T01, T23 };
    }
    var tableEncoding = /* @__PURE__ */ genTtable(
        sbox,
        (s) => (mul(s, 3) << 24) | (s << 16) | (s << 8) | mul(s, 2),
    );
    var xPowers = /* @__PURE__ */ (() => {
        let p2 = new Uint8Array(16);
        for (let i = 0, x2 = 1; i < 16; i++, x2 = mul2(x2)) p2[i] = x2;
        return p2;
    })();
    function expandKeyLE(key: Uint8Array) {
        abytes(key);
        let len = key.length;
        if (![16, 24, 32].includes(len))
            throw new Error(
                "aes: invalid key size, should be 16, 24 or 32, got " + len,
            );
        let { sbox2 } = tableEncoding,
            toClean: (Uint8Array | Uint32Array)[] = [];
        isAligned32(key) || toClean.push((key = copyBytes(key)));
        let k32 = u32(key),
            Nk = k32.length,
            subByte = (n: number) => applySbox(sbox2, n, n, n, n),
            xk = new Uint32Array(len + 28);
        xk.set(k32);
        for (let i = Nk; i < xk.length; i++) {
            let t = xk[i - 1];
            (i % Nk === 0
                ? (t = subByte(rotr32_8(t)) ^ xPowers[i / Nk - 1])
                : Nk > 6 && i % Nk === 4 && (t = subByte(t)),
                (xk[i] = xk[i - Nk] ^ t));
        }
        return (clean(...toClean), xk);
    }
    function apply0123(
        T01: Uint32Array,
        T23: Uint32Array,
        s0: number,
        s1: number,
        s2: number,
        s3: number,
    ) {
        return (
            T01[((s0 << 8) & 65280) | ((s1 >>> 8) & 255)] ^
            T23[((s2 >>> 8) & 65280) | ((s3 >>> 24) & 255)]
        );
    }
    function applySbox(
        sbox2: Uint16Array,
        s0: number,
        s1: number,
        s2: number,
        s3: number,
    ) {
        return (
            sbox2[(s0 & 255) | (s1 & 65280)] |
            (sbox2[((s2 >>> 16) & 255) | ((s3 >>> 16) & 65280)] << 16)
        );
    }
    function encrypt(
        xk: Uint32Array,
        s0: number,
        s1: number,
        s2: number,
        s3: number,
    ) {
        let { sbox2, T01, T23 } = tableEncoding,
            k = 0;
        ((s0 ^= xk[k++]), (s1 ^= xk[k++]), (s2 ^= xk[k++]), (s3 ^= xk[k++]));
        let rounds = xk.length / 4 - 2;
        for (let i = 0; i < rounds; i++) {
            let t02 = xk[k++] ^ apply0123(T01, T23, s0, s1, s2, s3),
                t12 = xk[k++] ^ apply0123(T01, T23, s1, s2, s3, s0),
                t22 = xk[k++] ^ apply0123(T01, T23, s2, s3, s0, s1),
                t32 = xk[k++] ^ apply0123(T01, T23, s3, s0, s1, s2);
            ((s0 = t02), (s1 = t12), (s2 = t22), (s3 = t32));
        }
        let t0 = xk[k++] ^ applySbox(sbox2, s0, s1, s2, s3),
            t1 = xk[k++] ^ applySbox(sbox2, s1, s2, s3, s0),
            t2 = xk[k++] ^ applySbox(sbox2, s2, s3, s0, s1),
            t3 = xk[k++] ^ applySbox(sbox2, s3, s0, s1, s2);
        return { s0: t0, s1: t1, s2: t2, s3: t3 };
    }
    function ctrCounter(xk: Uint32Array, nonce: Uint8Array, src: Uint8Array) {
        (abytes(nonce, BLOCK_SIZE), abytes(src));
        let srcLen = src.length;
        const dst = new Uint8Array(srcLen);
        let ctr2 = nonce,
            c32 = u32(ctr2),
            { s0, s1, s2, s3 } = encrypt(xk, c32[0], c32[1], c32[2], c32[3]),
            src32 = u32(src),
            dst32 = u32(dst);
        for (let i = 0; i + 4 <= src32.length; i += 4) {
            ((dst32[i + 0] = src32[i + 0] ^ s0),
                (dst32[i + 1] = src32[i + 1] ^ s1),
                (dst32[i + 2] = src32[i + 2] ^ s2),
                (dst32[i + 3] = src32[i + 3] ^ s3));
            let carry = 1;
            for (let i2 = ctr2.length - 1; i2 >= 0; i2--)
                ((carry = (carry + (ctr2[i2] & 255)) | 0),
                    (ctr2[i2] = carry & 255),
                    (carry >>>= 8));
            ({ s0, s1, s2, s3 } = encrypt(xk, c32[0], c32[1], c32[2], c32[3]));
        }
        let start = BLOCK_SIZE * Math.floor(src32.length / BLOCK_SIZE32);
        if (start < srcLen) {
            let b32 = new Uint32Array([s0, s1, s2, s3]),
                buf = new Uint8Array(b32.buffer);
            for (let i = start, pos = 0; i < srcLen; i++, pos++)
                dst[i] = src[i] ^ buf[pos];
            clean(b32);
        }
        return dst;
    }
    function aesCtr(
        expandedKey: Uint32Array,
        nonce: Uint8Array,
        input: Uint8Array,
    ) {
        const counter = copyBytes(nonce);
        const source = isAligned32(input) ? input : copyBytes(input);
        try {
            return ctrCounter(expandedKey, counter, source);
        } finally {
            clean(counter);
            if (source !== input) clean(source);
        }
    }
    function createView2(arr: Uint8Array) {
        return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
    }
    function rotr(word: number, shift: number) {
        return (word << (32 - shift)) | (word >>> shift);
    }
    // SHA-2 base
    function Chi(a: number, b: number, c: number) {
        return (a & b) ^ (~a & c);
    }
    function Maj(a: number, b: number, c: number) {
        return (a & b) ^ (a & c) ^ (b & c);
    }
    const SHA256_IV = /* @__PURE__ */ Uint32Array.from([
        1779033703, 3144134277, 1013904242, 2773480762, 1359893119, 2600822924,
        528734635, 1541459225,
    ]);

    // SHA-2
    var SHA256_K = /* @__PURE__ */ Uint32Array.from([
            1116352408, 1899447441, 3049323471, 3921009573, 961987163,
            1508970993, 2453635748, 2870763221, 3624381080, 310598401,
            607225278, 1426881987, 1925078388, 2162078206, 2614888103,
            3248222580, 3835390401, 4022224774, 264347078, 604807628, 770255983,
            1249150122, 1555081692, 1996064986, 2554220882, 2821834349,
            2952996808, 3210313671, 3336571891, 3584528711, 113926993,
            338241895, 666307205, 773529912, 1294757372, 1396182291, 1695183700,
            1986661051, 2177026350, 2456956037, 2730485921, 2820302411,
            3259730800, 3345764771, 3516065817, 3600352804, 4094571909,
            275423344, 430227734, 506948616, 659060556, 883997877, 958139571,
            1322822218, 1537002063, 1747873779, 1955562222, 2024104815,
            2227730452, 2361852424, 2428436474, 2756734187, 3204031479,
            3329325298,
        ]),
        SHA256_W = /* @__PURE__ */ new Uint32Array(64),
        SHA256 = class {
            declare length: number;
            declare pos: number;
            declare buffer: Uint8Array;
            declare view: DataView;
            declare A: number;
            declare B: number;
            declare C: number;
            declare D: number;
            declare E: number;
            declare F: number;
            declare G: number;
            declare H: number;
            constructor() {
                this.length = 0;
                this.pos = 0;
                this.buffer = new Uint8Array(64);
                this.view = createView2(this.buffer);
                this.set(
                    SHA256_IV[0],
                    SHA256_IV[1],
                    SHA256_IV[2],
                    SHA256_IV[3],
                    SHA256_IV[4],
                    SHA256_IV[5],
                    SHA256_IV[6],
                    SHA256_IV[7],
                );
            }
            update(data: Uint8Array) {
                const { view, buffer } = this;
                const len = data.length;
                for (let pos = 0; pos < len;) {
                    const take = Math.min(64 - this.pos, len - pos);
                    if (take === 64) {
                        const dataView = createView2(data);
                        for (; 64 <= len - pos; pos += 64)
                            this.process(dataView, pos);
                        continue;
                    }
                    buffer.set(data.subarray(pos, pos + take), this.pos);
                    this.pos += take;
                    pos += take;
                    if (this.pos === 64) {
                        this.process(view, 0);
                        this.pos = 0;
                    }
                }
                this.length += data.length;
                clean(SHA256_W);
                return this;
            }
            digest() {
                const { buffer, view, pos } = this;
                buffer[pos] = 128;
                buffer.fill(0, pos + 1);
                if (pos >= 56) {
                    this.process(view, 0);
                    buffer.fill(0);
                }
                view.setBigUint64(56, BigInt(this.length * 8), false);
                this.process(view, 0);
                const output = new Uint8Array(32);
                const outputView = createView2(output);
                const { A, B, C, D, E, F, G, H } = this;
                const state = [A, B, C, D, E, F, G, H];
                for (let i = 0; i < 8; i++)
                    outputView.setUint32(4 * i, state[i], false);
                this.set(0, 0, 0, 0, 0, 0, 0, 0);
                clean(buffer);
                return output;
            }
            // prettier-ignore
            set(A: number, B: number, C: number, D2: number, E2: number, F: number, G: number, H2: number) {
      this.A = A | 0, this.B = B | 0, this.C = C | 0, this.D = D2 | 0, this.E = E2 | 0, this.F = F | 0, this.G = G | 0, this.H = H2 | 0;
    }
            process(view: DataView, offset: number) {
                for (let i = 0; i < 16; i++, offset += 4)
                    SHA256_W[i] = view.getUint32(offset, !1);
                for (let i = 16; i < 64; i++) {
                    let W15 = SHA256_W[i - 15],
                        W2 = SHA256_W[i - 2],
                        s0 = rotr(W15, 7) ^ rotr(W15, 18) ^ (W15 >>> 3),
                        s1 = rotr(W2, 17) ^ rotr(W2, 19) ^ (W2 >>> 10);
                    SHA256_W[i] =
                        (s1 + SHA256_W[i - 7] + s0 + SHA256_W[i - 16]) | 0;
                }
                let { A, B, C, D: D2, E: E2, F, G, H: H2 } = this;
                for (let i = 0; i < 64; i++) {
                    let sigma1 = rotr(E2, 6) ^ rotr(E2, 11) ^ rotr(E2, 25),
                        T1 =
                            (H2 +
                                sigma1 +
                                Chi(E2, F, G) +
                                SHA256_K[i] +
                                SHA256_W[i]) |
                            0,
                        T2 =
                            ((rotr(A, 2) ^ rotr(A, 13) ^ rotr(A, 22)) +
                                Maj(A, B, C)) |
                            0;
                    ((H2 = G),
                        (G = F),
                        (F = E2),
                        (E2 = (D2 + T1) | 0),
                        (D2 = C),
                        (C = B),
                        (B = A),
                        (A = (T1 + T2) | 0));
                }
                ((A = (A + this.A) | 0),
                    (B = (B + this.B) | 0),
                    (C = (C + this.C) | 0),
                    (D2 = (D2 + this.D) | 0),
                    (E2 = (E2 + this.E) | 0),
                    (F = (F + this.F) | 0),
                    (G = (G + this.G) | 0),
                    (H2 = (H2 + this.H) | 0),
                    this.set(A, B, C, D2, E2, F, G, H2));
            }
        };
    class CryptoContext {
        declare expandedKey: Uint32Array;
        declare hmacKey: Uint8Array;
        declare iv: Uint8Array;
        constructor(key: Uint8Array) {
            this.expandedKey = expandKeyLE(key.slice(0, 16));
            this.hmacKey = key.slice(16);
        }
        signature(content: Uint8Array) {
            const pad = new Uint8Array(64);
            pad.set(
                this.hmacKey.length > 64
                    ? new SHA256().update(this.hmacKey).digest()
                    : this.hmacKey,
            );
            for (let i = 0; i < pad.length; i++) pad[i] ^= 54;
            // Feed ciphertext and IV separately; avoid copying the complete payload.
            const inner = new SHA256()
                .update(pad)
                .update(content)
                .update(this.iv)
                .digest();
            for (let i = 0; i < pad.length; i++) pad[i] ^= 106;
            const signature = new SHA256().update(pad).update(inner).digest();
            clean(pad, inner);
            return signature;
        }
        decrypt(part: {
            iv: Uint8Array;
            encryptedContent: Uint8Array;
            hmac: Uint8Array;
        }) {
            this.iv = part.iv;
            const signature = this.signature(part.encryptedContent);
            if (!equalBytes2(signature, part.hmac))
                throw new Error("HMAC verification failed");
            return aesCtr(this.expandedKey, this.iv, part.encryptedContent);
        }
        encrypt(content: Uint8Array) {
            const encryptedContent = aesCtr(this.expandedKey, this.iv, content);
            return { encryptedContent, hmac: this.signature(encryptedContent) };
        }
    }
    function equalBytes2(left: Uint8Array, right: Uint8Array) {
        if (left.length !== right.length) return false;
        let difference = 0;
        for (let index = 0; index < left.length; index++)
            difference |= left[index] ^ right[index];
        return difference === 0;
    }
    return { CryptoContext };
}
