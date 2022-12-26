const fetch = require("node-fetch");
const crypto = require("crypto");
const Jimp = require("jimp");
const Crypto = require("./crypto");
const KeyPad = require("./keypad");

class mTransKey {
    constructor() {
        this.crypto = new Crypto();
        this.token = "";
        this.qwerty = [];
        this.number = [];
    }

    async getServletData(cookies) {
        const requestToken = await fetch("https://m.cultureland.co.kr/transkeyServlet?op=getToken&" + new Date().getTime(), {
            "headers": {
                "cookie": cookies.join("; ")
            }
        }).then(res => res.text());

        this.token = String(new Function(requestToken + "return TK_requestToken")());

        this.initTime = await fetch("https://m.cultureland.co.kr/transkeyServlet?op=getInitTime", {
            "headers": {
                "cookie": cookies.join("; ")
            }
        }).then(res => res.text()).then(body => body.split("'")[1].split("'")[0]);
    }

    async getKeyData(cookies) {
        const keyPositions = await fetch("https://m.cultureland.co.kr/transkeyServlet", {
            "headers": {
                "content-type": "application/x-www-form-urlencoded",
                "cookie": cookies.join("; ")
            },
            "method": "POST",
            "body": `op=getKeyInfo&key=${this.crypto.encSessionKey}&transkeyUuid=${this.crypto.transkeyUuid}&useCert=true&TK_requestToken=${this.token}&mode=Mobile`
        }).then(res => res.text());

        const [qwerty, num] = keyPositions.split("var numberMobile = new Array();");

        this.qwerty = [];
        this.number = [];

        const _q = qwerty.split("qwertyMobile.push(key);");
        _q.pop();
        for (const p of _q) {
            const points = p.matchAll(/key\.addPoint\((\d+), (\d+)\);/g);
            const key = [...points][0];
            this.qwerty.push([key[1], key[2]]);
        }

        const _n = num.split("numberMobile.push(key);");
        _n.pop();
        for (const p of _n) {
            const points = p.matchAll(/key\.addPoint\((\d+), (\d+)\);/g);
            const key = [...points][0];
            this.number.push([key[1], key[2]]);
        }
    }

    async createKeypad(cookies, key_type, name, inputName, fieldType = "password") {
        const keyIndex = await fetch("https://m.cultureland.co.kr/transkeyServlet", {
            "headers": {
                "content-type": "application/x-www-form-urlencoded",
                "cookie": cookies.join("; ")
            },
            "method": "POST",
            "body": `op=getKeyIndex&name=${name}&keyType=single&keyboardType=${key_type}Mobile&fieldType=${fieldType}&inputName=${inputName}&parentKeyboard=false&transkeyUuid=${this.transkeyUuid}&exE2E=false&TK_requestToken=${this.token}&allocationIndex=${this.allocationIndex}&keyIndex=&initTime=${this.initTime}&talkBack=true`
        }).then(res => res.text());

        const keyImage = await fetch(`https://m.cultureland.co.kr/transkeyServlet?op=getKey&name=${name}&keyType=single&keyboardType=${key_type}Mobile&fieldType=${fieldType}&inputName=${inputName}&parentKeyboard=false&transkeyUuid=${this.transkeyUuid}&exE2E=false&TK_requestToken=${this.token}&allocationIndex=${this.allocationIndex}&keyIndex=${keyIndex}&initTime=${this.initTime}`)
            .then(res => res.buffer());

        if (key_type === "qwerty") return new KeyPad(this.qwerty, keyImage, this.crypto.sessionKey, keyIndex);
        else return new KeyPad(this.number, keyImage, this.crypto.sessionKey, keyIndex);
    }
}

module.exports = mTransKey;