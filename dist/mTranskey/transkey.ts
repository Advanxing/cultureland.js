import axios from "axios";
import { HttpCookieAgent, HttpsCookieAgent } from "http-cookie-agent/http";
import { CookieJar } from "tough-cookie";
import Crypto from "./Crypto.js";
import Keypad from "./Keypad.js";
import { ServletData } from "./types.js";
import { generateRandomHex, generateRandomInt, generateRandomKey } from "./utils.js";

export class mTransKey {
    public sessionKey: number[];
    public transkeyUuid: string;
    public genSessionKey: string;
    public encryptedSessionKey: string;
    public allocationIndex: number;
    public constructor(public cookieJar: CookieJar) {
        this.transkeyUuid = Crypto.hashString("sha256", generateRandomHex(50));
        this.genSessionKey = generateRandomKey(128);
        this.sessionKey = new Array(16).fill(null).map((_, i) => parseInt(this.genSessionKey.charAt(i), 16));
        this.encryptedSessionKey = Crypto.phpbb_encrypt2048(this.genSessionKey, Crypto.publicKey[0], Crypto.publicKey[1]);
        this.allocationIndex = generateRandomInt();
    }

    /**
     * 트랜스키 서블릿 정보를 받아옵니다. `TK_requestToken` `initTime` `keyInfo`
     */
    public async getServletData(): Promise<ServletData> {
        const options = {
            httpAgent: new HttpCookieAgent({ cookies: { jar: this.cookieJar } }),
            httpsAgent: new HttpsCookieAgent({ cookies: { jar: this.cookieJar } }),
            headers: {
                "User-Agent": "Mozilla/5.0 (Linux; Android 11; SM-G998N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Mobile Safari/537.36",
                "Connection": "keep-alive"
            }
        };

        // TK_requestToken
        const requestTokenResponse: string = await axios.get("https://m.cultureland.co.kr/transkeyServlet?op=getToken&" + new Date().getTime(), options).then(res => res.data);

        const requestToken = requestTokenResponse.match(/var TK_requestToken=([\d-]+);/)?.[1] ?? "0";

        // initTime
        const initTimeResponse: string = await axios.get("https://m.cultureland.co.kr/transkeyServlet?op=getInitTime", options).then(res => res.data);

        const initTime = initTimeResponse.match(/var initTime='([\d-]+)';/)?.[1] ?? "0";

        // keyInfo (키 좌표)
        const keyPositions: string = await axios.post("https://m.cultureland.co.kr/transkeyServlet", new URLSearchParams({
            "op": "getKeyInfo",
            "key": this.encryptedSessionKey,
            "transkeyUuid": this.transkeyUuid,
            "useCert": "true",
            "TK_requestToken": requestToken,
            "mode": "Mobile"
        }).toString(), options).then(res => res.data);

        const [qwerty, number] = keyPositions.split("var numberMobile = new Array();");

        // keyInfo.qwerty
        const qwertyInfo: [number, number][] = [];
        const qwertyPoints = qwerty.split("qwertyMobile.push(key);");
        qwertyPoints.pop();

        for (const p of qwertyPoints) {
            const points = p.matchAll(/key\.addPoint\((\d+), (\d+)\);/g);
            const key = [...points][0];
            qwertyInfo.push([parseInt(key[1]), parseInt(key[2])]); // 키 좌표
        }

        // keyInfo.number
        const numberInfo: [number, number][] = [];
        const numberPoints = number.split("numberMobile.push(key);");
        numberPoints.pop();

        for (const p of numberPoints) {
            const points = p.matchAll(/key\.addPoint\((\d+), (\d+)\);/g);
            const key = [...points][0];
            numberInfo.push([parseInt(key[1]), parseInt(key[2])]); // 키 좌표
        }

        return {
            requestToken,
            initTime,
            keyInfo: {
                qwerty: qwertyInfo,
                number: numberInfo
            }
        };
    }

    /**
     * 트랜스키 서블릿 정보를 바탕으로 키패드를 생성합니다.
     * @param servletData 트랜스키 서블릿 정보 `TK_requestToken` `initTime` `keyInfo`
     * @param keyboardType 키보드 종류 (`qwerty` | `number`)
     * @param name 키패드 아이디 (`txtScr14`)
     * @param inputName 키패드 이름 (`scr14`)
     * @param fieldType 키패드 종류 (`password`)
     * @returns Keypad
     */
    public createKeypad(servletData: ServletData, keyboardType: "qwerty" | "number", name: string, inputName: string, fieldType = "password") {
        return new Keypad(
            this,
            servletData,
            keyboardType,
            name,
            inputName,
            fieldType
        );
    }
}

export default mTransKey;