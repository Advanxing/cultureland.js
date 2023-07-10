import axios from "axios";
import { HttpCookieAgent, HttpsCookieAgent } from "http-cookie-agent/http";
import qs from "querystring";
import Crypto from "./crypto.js";
import KeyPad from "./keypad.js";

class mTransKey {
    constructor() {
        this.crypto = new Crypto();
        this.token = "";
        this.qwerty = [];
        this.number = [];
    }

    async getServletData(jar) {
        const options = {
            httpAgent: new HttpCookieAgent({ cookies: { jar } }),
            httpsAgent: new HttpsCookieAgent({ cookies: { jar } }),
            headers: {
                "User-Agent": "Mozilla/5.0 (Linux; Android 11; SM-G998N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Mobile Safari/537.36",
                "Connection": "keep-alive"
            }
        };
        const requestToken = await axios.get("https://m.cultureland.co.kr/transkeyServlet?op=getToken&" + new Date().getTime(), options).then(res => res.data);

        this.token = String(new Function(requestToken + "return TK_requestToken")());

        this.initTime = await axios.get("https://m.cultureland.co.kr/transkeyServlet?op=getInitTime", options).then(res => res.data.split("'")[1].split("'")[0]);
    }

    async getKeyData(jar) {
        const options = {
            httpAgent: new HttpCookieAgent({ cookies: { jar } }),
            httpsAgent: new HttpsCookieAgent({ cookies: { jar } }),
            headers: {
                "User-Agent": "Mozilla/5.0 (Linux; Android 11; SM-G998N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Mobile Safari/537.36",
                "Connection": "keep-alive"
            }
        };
        const keyPositions = await axios.post("https://m.cultureland.co.kr/transkeyServlet", qs.stringify({
            "op": "getKeyInfo",
            "key": this.crypto.encSessionKey,
            "transkeyUuid": this.crypto.transkeyUuid,
            "useCert": true,
            "TK_requestToken": this.token,
            "mode": "Mobile"
        }), options).then(res => res.data);

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

    async createKeypad(jar, keyboardType, name, inputName, fieldType = "password") {
        const options = {
            httpAgent: new HttpCookieAgent({ cookies: { jar } }),
            httpsAgent: new HttpsCookieAgent({ cookies: { jar } }),
            headers: {
                "User-Agent": "Mozilla/5.0 (Linux; Android 11; SM-G998N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Mobile Safari/537.36",
                "Connection": "keep-alive"
            }
        };
        const keyIndex = await axios.post("https://m.cultureland.co.kr/transkeyServlet", qs.stringify({
            "op": "getKeyIndex",
            "name": name,
            "keyType": keyboardType === "qwerty" ? "lower" : "single",
            "keyboardType": `${keyboardType}Mobile`,
            "fieldType": fieldType,
            "inputName": inputName,
            "parentKeyboard": false,
            "transkeyUuid": this.transkeyUuid,
            "exE2E": false,
            "TK_requestToken": this.token,
            "allocationIndex": this.crypto.allocationIndex,
            "keyIndex": "",
            "initTime": this.initTime,
            "talkBack": true
        }), options).then(res => res.data);

        const keyImage = await axios.get("https://m.cultureland.co.kr/transkeyServlet?" + qs.stringify({
            "op": "getKey",
            "name": name,
            "keyType": keyboardType === "qwerty" ? "lower" : "single",
            "keyboardType": `${keyboardType}Mobile`,
            "fieldType": fieldType,
            "inputName": inputName,
            "parentKeyboard": false,
            "transkeyUuid": this.transkeyUuid,
            "exE2E": false,
            "TK_requestToken": this.token,
            "allocationIndex": this.crypto.allocationIndex,
            "keyIndex": keyIndex,
            "initTime": this.initTime
        }), Object.assign({
            responseType: "arraybuffer"
        }, options))
            .then(res => Buffer.from(res.data, "binary"));
        return new KeyPad(keyboardType === "qwerty" ? this.qwerty : this.number, keyboardType, keyImage, this.crypto.sessionKey, keyIndex, fieldType);
    }
}

export default mTransKey;