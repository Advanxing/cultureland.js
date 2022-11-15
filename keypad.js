class KeyPad {
    constructor(skipData, keys, sessionKey, keyIndex) {
        this.skipData = skipData;
        this.keys = keys;
        this.sessionKey = sessionKey;
        this.keyIndex = keyIndex;
    }

    encryptPassword(pw) {
        var encrypted = "";

        for (const val of pw.split("")) {
            const geo = this.keys[this.skipData.indexOf(Number(val))];
            encrypted += "$" + new require("./seed").SeedEnc(geo.join(" "), this.sessionKey);
        }
        return encrypted;
    }
}

module.exports = KeyPad;