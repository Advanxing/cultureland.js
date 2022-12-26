const crypto = require("crypto");
const Jimp = require("jimp");
const Seed = require("./seed");

const keyHashes = [
    "84f2eb127557f50338745a1efd1fabff", // 0
    "514e7f310783341192e91c2c51a52b84", // 1
    "79bfa52825b615af6ddb030feb2a8c41", // 2
    "d5f695d8e5b1b03f5e3f772585e601fe", // 3
    "66852070450c975e4e99192e9dc7ea8d", // 4
    "13901eb0b5a9fc5ff09e85075c29a324", // 5
    "cca1b470d8592bb1393922ca8e96792f", // 6
    "26b2dda3652b522653cc1f818de3cdac", // 7
    "915c6ece9e55c1e68b34acfc2ee0f69b", // 8
    "88d105f5dc94ee594d3d8d94da55fbc8", // 9
    "72b37a3cde7c13926b2404f47a19da5e" // -
];

class KeyPad {
    constructor(keys, keyImage, sessionKey, keyIndex) {
        this.keys = keys;
        this.keyImage = keyImage;
        this.sessionKey = sessionKey;
        this.keyIndex = keyIndex;
    }

    encryptPassword(pw, skipData) {
        var encrypted = "";
        const seed = new Seed();

        for (const val of pw.split("")) {
            const geo = this.keys[skipData.indexOf(Number(val))];
            encrypted += "$" + Seed.SeedEnc(geo.join(" "), this.sessionKey);
        }

        return encrypted;
    }

    async getSkipData() {
        const keyImage = await Jimp.read(this.keyImage);
        const keys = [];
        for (var i = 0; i < 3; i++) {
            for (var x = 0; x < 4; x++) {
                keys.push(keyImage.clone().crop(x * 160 + 70, i * 102 + 45, 20, 25));
            }
        }

        const skipData = [];
        for (const key of keys) {
            const keyPayload = await key.getBase64Async(Jimp.MIME_PNG);
            const keyHash = crypto.createHash("md5").update(keyPayload).digest("hex");

            skipData.push(keyHashes.indexOf(keyHash));
        }

        return skipData;
    }
}

module.exports = KeyPad;