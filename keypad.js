import crypto from "crypto";
import Jimp from "jimp";
import Seed from "./seed.js";

const specialChars = ["`", "~", "!", "@", "#", "$", "%", "^", "&", "*", "(", ")", "-", "_", "=", "+", "[", "{", "]", "}", "\\", "|", ";", ":", "/", "?", ",", "<", ".", ">", "'", "\"", "+", "-", "*", "/"];
const lowerChars = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "a", "s", "d", "f", "g", "h", "j", "k", "l", "z", "x", "c", "v", "b", "n", "m"];
const numberKeyHashes = [
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
    "72b37a3cde7c13926b2404f47a19da5e" // empty
];

class KeyPad {
    constructor(keys, keyboardType, keyImage, sessionKey, keyIndex, fieldType) {
        this.keys = keys;
        this.keyboardType = keyboardType;
        this.keyImage = keyImage;
        this.sessionKey = sessionKey;
        this.keyIndex = keyIndex;
        this.fieldType = fieldType;
    }

    encryptPassword(pw, skipData) {
        var encrypted = "";
        for (const val of pw.split("")) {
            const geo = this.keys[skipData.indexOf(specialChars.includes(val) ? specialChars.indexOf(val) : this.keyboardType === "qwerty" ? lowerChars.indexOf(val.toLowerCase()) : Number(val))];
            if (!geo) throw new Error("ERROR_GEO_NOT_FOUND");
            let geoString = geo.join(" ");
            if (this.keyboardType === "qwerty") {
                if (specialChars.includes(val)) geoString = "s " + geo.join(" ");
                else if (val === val.toUpperCase()) geoString = "u " + geo.join(" ");
                else geoString = "l " + geo.join(" "); //if (val === val.toLowerCase() || !isNaN(val))
            };
            encrypted += "$" + Seed.SeedEnc(geoString, this.sessionKey);
        };
        return encrypted;
    }

    async getSkipData() {
        const keyImage = await Jimp.read(this.keyImage);
        // keyImage.writeAsync(`./keypad.png`);
        const keys = [];
        // const test = [];
        for (var y = 0; y < (this.keyboardType === "qwerty" ? 4 : 3/*number*/); y++) {
            for (var x = 0; x < (this.keyboardType === "qwerty" ? 11 : 4); x++) {
                const img = keyImage.clone().crop(this.keyboardType === "qwerty" ? x * 54 + 22 : x * 160 + 70, this.keyboardType === "qwerty" ? y * 80 + 30 : y * 102 + 45, this.keyboardType === "qwerty" ? 15 : 20, this.keyboardType === "qwerty" ? 45 : 25);
                if (this.keyboardType === "qwerty" && (((x === 9 || x === 10) && y === 3) || (x === 0 && y === 3))) continue;
                // test.push({
                //     x,
                //     y,
                //     hash: crypto.createHash("md5").update(await img.getBase64Async(Jimp.MIME_PNG)).digest("hex")
                // });
                // img.writeAsync(`./keypad/${this.keyboardType}/${x}_${y}.png`);
                keys.push(img);
            }
        }
        // console.log(test);

        const skipData = [];
        let keyidx = 0;
        for (const key of keys) {
            const keyPayload = await key.getBase64Async(Jimp.MIME_PNG);
            const keyHash = crypto.createHash("md5").update(keyPayload).digest("hex");
            if (this.keyboardType === "qwerty") {
                if (keyHash === "44529f2104900879d858baf3f763b3b2") skipData.push(-1);
                else skipData.push(keyidx++);
            } else {
                skipData.push(numberKeyHashes.indexOf(keyHash));
            };
        }
        return skipData;
    }
}

export default KeyPad;