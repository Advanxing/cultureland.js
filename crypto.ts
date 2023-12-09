import { BigInteger, SecureRandom } from "@modern-dev/jsbn";
import crypto from "crypto";
import genKey from "./genKey.js";
const pKey = ["00ce263e3fd958264da51416be398e42d893df856851e56358377fa4296accb1695b772453b6fb9df530633739648db5bdcec56f9b4358d96635af646a96c2ffdabfc96319074aa99ac94494071225ec43f4ce1e03dc9d0b6df4f56c5d2c2b2e743c3836570de64aace82d9c35977568390fe196a67dd19b5a30ec66a8d0405a9d160ec7ad81f33e7e66e5da42938aa6ad8c8b743cc0f87b4a4954fbc1c78303046e503cfbb430c37a27503a6ff9ae403f51e311b07d4f005e925745ea3f9c6c2ad0033e41ed97fd24e2292de3336433d92fc1c22ffed72645c443a679ac52c64c101c67bdba389a3276dfd1539af9eab8cef96cf565bebb688da7d60822390a4b", "010001"];

class Crypto {
    public sessionKey: number[];
    public transkeyUuid: string;
    public genSessionKey: string;
    public encSessionKey: string;
    public allocationIndex: number;
    public constructor() {
        this.sessionKey = new Array(16);
        this.transkeyUuid = genKey.tk_sh1prng();
        this.genSessionKey = genKey.GenerateKey(128);
        for (var i = 0; i < 16; i++) this.sessionKey[i] = Number("0x0" + this.genSessionKey.charAt(i));
        this.encSessionKey = this.phpbb_encrypt2048(this.genSessionKey, 256, pKey[1], pKey[0]);
        this.allocationIndex = genKey.tk_getrnd_int();
    }

    public sha1Hash(msg: string) {
        var K = [0x5a827999, 0x6ed9eba1, 0x8f1bbcdc, 0xca62c1d6];
        msg += String.fromCharCode(0x80);
        var l = msg.length / 4 + 2;
        var N = Math.ceil(l / 16);
        var M = new Array(N);
        for (var i = 0; i < N; i++) {
            M[i] = new Array(16);
            for (var j = 0; j < 16; j++) {
                M[i][j] = (msg.charCodeAt(i * 64 + j * 4) << 24) | (msg.charCodeAt(i * 64 + j * 4 + 1) << 16) | (msg.charCodeAt(i * 64 + j * 4 + 2) << 8) | (msg.charCodeAt(i * 64 + j * 4 + 3));
            }
        }
        M[N - 1][14] = ((msg.length - 1) * 8) / Math.pow(2, 32);
        M[N - 1][14] = Math.floor(M[N - 1][14]);
        M[N - 1][15] = ((msg.length - 1) * 8) & 0xffffffff;
        var H0 = 0x67452301;
        var H1 = 0xefcdab89;
        var H2 = 0x98badcfe;
        var H3 = 0x10325476;
        var H4 = 0xc3d2e1f0;
        var W = new Array(80);
        var a, b, c, d, e;
        for (var i = 0; i < N; i++) {
            for (var t = 0; t < 16; t++) W[t] = M[i][t];
            for (var t = 16; t < 80; t++) W[t] = this.ROTL(W[t - 3] ^ W[t - 8] ^ W[t - 14] ^ W[t - 16], 1);
            a = H0;
            b = H1;
            c = H2;
            d = H3;
            e = H4;
            for (var t = 0; t < 80; t++) {
                var s = Math.floor(t / 20);
                var T: number = (this.ROTL(a, 5) + (this.tk_f_(s, b, c, d) || 0) + e + K[s] + W[t]) & 0xffffffff;
                e = d;
                d = c;
                c = this.ROTL(b, 30);
                b = a;
                a = T;
            }
            H0 = (H0 + a) & 0xffffffff;
            H1 = (H1 + b) & 0xffffffff;
            H2 = (H2 + c) & 0xffffffff;
            H3 = (H3 + d) & 0xffffffff;
            H4 = (H4 + e) & 0xffffffff;
        }
        return this.toHexStr(H0) + this.toHexStr(H1) + this.toHexStr(H2) + this.toHexStr(H3) + this.toHexStr(H4);
    }

    public tk_f_(s: number, x: number, y: number, z: number) {
        switch (s) {
            case 0:
                return (x & y) ^ (~x & z);
            case 1:
                return x ^ y ^ z;
            case 2:
                return (x & y) ^ (x & z) ^ (y & z);
            case 3:
                return x ^ y ^ z;
        }
    }

    public ROTL(x: number, n: number) {
        return (x << n) | (x >>> (32 - n));
    }

    public toHexStr(n: number) {
        var s = "", v;
        for (var i = 7; i >= 0; i--) {
            v = (n >>> (i * 4)) & 0xf;
            s += v.toString(16);
        }
        return s;
    }

    public pack(source: string) {
        var temp = "";
        for (var i = 0; i < source.length; i += 2) temp += String.fromCharCode(parseInt(source.substring(i, i + 2), 16));
        return temp;
    }

    public xor(a: string, b: string) {
        var length = Math.min(a.length, b.length);
        var temp = "";
        for (var i = 0; i < length; i++) temp += String.fromCharCode(a.charCodeAt(i) ^ b.charCodeAt(i));

        length = Math.max(a.length, b.length) - length;
        for (var i = 0; i < length; i++) temp += "\x00";
        return temp;
    }

    public mgf1(mgfSeed: string, maskLen: number) {
        let t = "";
        const hLen = 20;
        const count = Math.ceil(maskLen / hLen);
        for (let i = 0; i < count; i++) {
            const c = String.fromCharCode((i >> 24) & 0xFF, (i >> 16) & 0xFF, (i >> 8) & 0xFF, i & 0xFF);
            t += this.pack(this.sha1Hash(mgfSeed + c));
        }

        return t.substring(0, maskLen);
    }

    public hmacDigest(plainText: string) {
        return crypto.createHmac("sha256", this.genSessionKey).update(plainText).digest("hex");
    }

    public rsaes_oaep_encrypt(m: string, n: BigInteger, k: number, e: BigInteger) {
        var hLen = 20;

        var mLen = m.length;
        if (mLen > k - 2 * hLen - 2) throw new Error("too long");

        var lHash = "\xda\x39\xa3\xee\x5e\x6b\x4b\x0d\x32\x55\xbf\xef\x95\x60\x18\x90\xaf\xd8\x07\x09";

        var ps = "";
        var temp = k - mLen - 2 * hLen - 2;
        var temp2: any[];
        for (var i = 0; i < temp; i++) ps += "\x00";

        var db = lHash + ps + "\x01" + m;
        var seed = "";
        for (var i = 0; i < hLen + 4; i += 4) {
            temp2 = new Array(4);
            new SecureRandom().nextBytes(temp2);
            seed += String.fromCharCode(temp2[0], temp2[1], temp2[2], temp2[3]);
        };
        seed = seed.substring(4 - seed.length % 4);
        var dbMask = this.mgf1(seed, k - hLen - 1);

        var maskedDB = this.xor(db, dbMask);
        var seedMask = this.mgf1(maskedDB, hLen);
        var maskedSeed = this.xor(seed, seedMask);
        var em = "\x00" + maskedSeed + maskedDB;

        let m2 = new Array();
        for (i = 0; i < em.length; i++) m2[i] = em.charCodeAt(i);

        let m3 = new BigInteger(m2, 256);
        var c = m3.modPow(e, n);
        let c2 = c.toString(16);
        if (c2.length & 1) c2 = "0" + c2;

        return c2;
    }

    public phpbb_encrypt2048(plaintext: string, k: number, e: string, n: string) {
        var temp = new Array(32);
        new SecureRandom().nextBytes(temp);

        var _e = new BigInteger(e, 16);
        var _n = new BigInteger(n, 16);

        var _rsaoen = "";

        while (_rsaoen.length < 512) {
            _rsaoen = this.rsaes_oaep_encrypt(plaintext, _n, k, _e);
            if (_rsaoen.length > 511) break;
        }

        return _rsaoen;
    }
};

export default Crypto;