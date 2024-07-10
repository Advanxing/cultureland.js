import crypto from "crypto";
import NodeRSA from "node-rsa";

export class Crypto {
    public static publicKey = [
        "00ce263e3fd958264da51416be398e42d893df856851e56358377fa4296accb1695b772453b6fb9df530633739648db5bdcec56f9b4358d96635af646a96c2ffdabfc96319074aa99ac94494071225ec43f4ce1e03dc9d0b6df4f56c5d2c2b2e743c3836570de64aace82d9c35977568390fe196a67dd19b5a30ec66a8d0405a9d160ec7ad81f33e7e66e5da42938aa6ad8c8b743cc0f87b4a4954fbc1c78303046e503cfbb430c37a27503a6ff9ae403f51e311b07d4f005e925745ea3f9c6c2ad0033e41ed97fd24e2292de3336433d92fc1c22ffed72645c443a679ac52c64c101c67bdba389a3276dfd1539af9eab8cef96cf565bebb688da7d60822390a4b",
        "010001"
    ];
    private constructor() { }

    public static hashString(algorithm: string, data: string) { // Replaces GenKey.tk_sh1prng
        return crypto.createHash(algorithm).update(data).digest("hex");
    }

    public static hmacDigest(genSessionKey: string, plainText: string) {
        return crypto.createHmac("sha256", genSessionKey).update(plainText).digest("hex");
    }

    public static encryptRsaesOaep(text: string, key: NodeRSA) {
        const encrypted = key.encrypt(Buffer.from(text), "hex", "utf8");
        return encrypted;
    }

    public static phpbb_encrypt2048(plaintext: string, n: string, e: string) {
        const key = new NodeRSA();
        key.importKey({
            n: Buffer.from(n, "hex"),
            e: parseInt(e, 16)
        }, "components-public");

        let encrypted = "";
        while (encrypted.length < 512) encrypted += Crypto.encryptRsaesOaep(plaintext, key);

        return encrypted.slice(0, 512); // Return only the first 512 characters
    }
}

export default Crypto;