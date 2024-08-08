import crypto from "crypto";

// 컬쳐랜드 mTranskey RSA 퍼블릭 키
const publicKey = [
    "00ce263e3fd958264da51416be398e42d893df856851e56358377fa4296accb1695b772453b6fb9df530633739648db5bdcec56f9b4358d96635af646a96c2ffdabfc96319074aa99ac94494071225ec43f4ce1e03dc9d0b6df4f56c5d2c2b2e743c3836570de64aace82d9c35977568390fe196a67dd19b5a30ec66a8d0405a9d160ec7ad81f33e7e66e5da42938aa6ad8c8b743cc0f87b4a4954fbc1c78303046e503cfbb430c37a27503a6ff9ae403f51e311b07d4f005e925745ea3f9c6c2ad0033e41ed97fd24e2292de3336433d92fc1c22ffed72645c443a679ac52c64c101c67bdba389a3276dfd1539af9eab8cef96cf565bebb688da7d60822390a4b",
    "010001"
];

export function rsaEncrypt(text: string) {
    const key = crypto.createPublicKey({
        format: "jwk",
        key: {
            kty: "RSA",
            n: Buffer.from(publicKey[0], "hex").toString("base64url"),
            e: Buffer.from(publicKey[1], "hex").toString("base64url")
        }
    });

    const encrypted = crypto.publicEncrypt(key, Buffer.from(text));
    return encrypted.toString("hex").slice(0, 512); // 처음 512글자만 사용
}