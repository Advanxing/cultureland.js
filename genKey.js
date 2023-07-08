import crypto from "crypto";
const screen = { width: 1920, height: 1080, availWidth: 1920, availHeight: 1040, colorDepth: 24 };

class GenKey {
    static GenerateKey(bit) {
        const cnt = bit / 32;
        var key = "";
        for (var i = 0; i < cnt; i++) key += this.tk_getrnd_hex(2);
        return key;
    }

    static tk_get_entropy() {
        const now = new Date();
        const Xseed1 = now.getSeconds();
        const Xseed2 = now.getMilliseconds();
        const a = Xseed2 + screen.height.toString() + screen.colorDepth.toString() + screen.availWidth.toString() + screen.availHeight.toString() + Xseed1.toString() + 10325476 + Xseed2.toString();
        return a;
    }

    static tk_sh1prng() {
        const now = new Date();
        const g_tk_seed = crypto.createHash("sha256").update(this.tk_get_entropy()).digest("hex");
        const XSEEDj = now.getSeconds() + now.getMilliseconds();
        const a = XSEEDj + g_tk_seed + 1;
        return crypto.createHash("sha256").update(a).digest("hex");
    }

    static tk_getrnd_hex(length) {
        var rand = "";

        if (length < 20) {
            rand = this.tk_sh1prng();
            rand = rand.substring(0, length * 2);
        }
        else {
            for (var i = 0; i < parseInt(length / 20); i++) rand += this.tk_sh1prng();

            if (length % 20) {
                rand_tmp = this.tk_sh1prng();
                rand += rand_tmp.substring(0, (length % 20) * 2);
            }
        }

        return rand;
    }

    static tk_getrnd_int() {
        var rand = "";
        var rand_int = 0;
        rand = this.tk_sh1prng();
        rand = rand.substring(0, 8);
        rand_int = parseInt(rand, 16);
        return rand_int;
    }
}

export default GenKey;