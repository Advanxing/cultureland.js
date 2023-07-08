import qs from "querystring";
import mTransKey from "./transkey.js";
import crypto from "crypto";
import axios from "axios";
import { CookieJar } from "tough-cookie";
import { HttpCookieAgent, HttpsCookieAgent } from "http-cookie-agent/http";

class Cultureland {
    constructor() {
        this.jar = new CookieJar();
        this.client = axios.create({
            headers: {
                "User-Agent": "Mozilla/5.0 (Linux; Android 11; SM-G998N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Mobile Safari/537.36",
                "Connection": "keep-alive"
            },
            httpAgent: new HttpCookieAgent({ cookies: { jar: this.jar } }),
            httpsAgent: new HttpsCookieAgent({ cookies: { jar: this.jar } })
        });
    }

    async checkPin(pin, isMobile = true) {
        const voucherData = await this.client.post(`https://www.cultureland.co.kr/voucher/getVoucherCheck${isMobile ? "Mobile" : ""}Used.do`, qs.stringify({ code: pin })).then(res => res.data);
        return voucherData;
    }

    async getBalance() {
        if (!await this.isLogin()) throw new Error("ERR_LOGIN_REQUIRED");

        const balance = await this.client.post("https://m.cultureland.co.kr/tgl/getBalance.json").then(res => res.data);

        if (balance.resultMessage !== "성공") throw new Error("ERR_BALANCE_FAILED");

        for (const key in balance) {
            if (!isNaN(balance[key])) balance[key] = Number(balance[key]);
        }

        return balance;
    }

    async charge(pin, check = true) {
        // if (!await this.isLogin()) throw new Error("ERR_LOGIN_REQUIRED");

        if (check) {
            // const voucherData = await this.check(pin);
            // console.log(voucherData);

            // TODO: validate voucher codes
        }

        await this.client.get(pin[3].length === 4 ? "https://m.cultureland.co.kr/csh/cshGiftCard.do" : "https://m.cultureland.co.kr/csh/cshGiftCardOnline.do");

        const transKey = new mTransKey();
        await transKey.getServletData(this.jar);
        await transKey.getKeyData(this.jar);

        const keypad = await transKey.createKeypad(this.jar, "number", "txtScr14", "scr14", "password");
        const skipData = await keypad.getSkipData();
        const encryptedPin = keypad.encryptPassword(pin[3], skipData);

        const requestBody = qs.stringify({
            versionCode: "",
            scr11: pin[0],
            scr12: pin[1],
            scr13: pin[2],
            scr14: "*".repeat(pin[3].length),
            seedKey: transKey.crypto.encSessionKey,
            initTime: transKey.initTime,
            keyIndex_txtScr14: keypad.keyIndex,
            keyboardType_txtScr14: "numberMobile",
            fieldType_txtScr14: "password",
            transkeyUuid: transKey.crypto.transkeyUuid,
            transkey_txtScr14: encryptedPin,
            transkey_HM_txtScr14: transKey.crypto.hmacDigest(encryptedPin)
        });
        const chargeRequest = await this.client.post(pin[3].length === 4 ? "https://m.cultureland.co.kr/csh/cshGiftCardProcess.do" : "https://m.cultureland.co.kr/csh/cshGiftCardOnlineProcess.do", requestBody, {
            maxRedirects: 0,
            validateStatus: status => status === 302
        }).catch(() => { throw new Error("ERR_CHARGE_FAILED") });
        const chargeResult = await this.client.get("https://m.cultureland.co.kr/" + chargeRequest.headers["location"]).then(res => res.data);
        const chargeData = chargeResult.split("<tbody>")[1].split("<td>");
        const reason = chargeData[3].split("</td>")[0].replace(/<\/?[\d\w\s='#]+>/g, "");
        const amount = Number(chargeData[4].split("</td>")[0].replace(/\D/g, ""));
        const chargeData2 = chargeResult.split('class="result">')[1].split("</div>")[0];
        const [normalAmount, walletAmount] = chargeData2.split("dlWalletChargeAmt").map(x => Number(x.replace(/\D/g, "")));
        return {
            amount: Math.min(Math.max(normalAmount, walletAmount), amount),
            reason
        };
    }

    async gift(amount, quantity, phone) {
        if (!await this.isLogin()) throw new Error("ERR_LOGIN_REQUIRED");

        await this.client.get("https://m.cultureland.co.kr/gft/gftPhoneApp.do");

        await this.client.post("https://m.cultureland.co.kr/gft/gftPhoneCashProc.do", qs.stringify({
            revEmail: "",
            sendType: "S",
            userKey: user_key,
            limitGiftBank: "N",
            giftCategory: "M",
            amount,
            quantity,
            revPhone: phone,
            sendTitl: "",
            paymentType: "cash"
        }), {
            validateStatus: status => status === 302
        }).catch(() => { throw new Error("ERR_GIFT_FAILED"); });

        const giftResult = await this.client.get("https://m.cultureland.co.kr/gft/gftPhoneCfrm.do").then(res => res.data);

        if (giftResult.includes('<p>선물(구매)하신 <strong class="point">모바일문화상품권</strong>을<br /><strong class="point">요청하신 정보로 전송</strong>하였습니다.</p>')) {
            const giftData = giftResult.split("- 상품권 바로 충전 : https://m.cultureland.co.kr/csh/dc.do?code=")[1].split("&lt;br&gt;");

            return {
                code: giftData[0],
                pin: giftData[8].replace("- 바코드번호 : ", ""),
                reason: "선물(구매)하신 모바일문화상품권을 요청하신 정보로 전송하였습니다"
            };
        }

        throw new Error("ERR_GIFT_FAILED");
    }

    async isLogin() {
        const isLogin = await this.client.post("https://m.cultureland.co.kr/mmb/isLogin.json").then(res => res.data);
        return isLogin;
    }

    async getUserInfo() {
        if (!this.isLogin()) throw new Error("ERR_LOGIN_REQUIRED");

        const userInfo = await this.client.post("https://m.cultureland.co.kr/tgl/flagSecCash.json").then(res => res.data);

        if (userInfo.resultMessage !== "성공") throw new Error("ERR_USERINFO_FAILED");

        delete userInfo.user_id;
        delete userInfo.user_key;
        userInfo.CashPwd = userInfo.CashPwd !== "0";
        userInfo.Del_Yn = userInfo.Del_Yn === "Y";
        userInfo.idx = Number(userInfo.idx);
        userInfo.SafeLevel = Number(userInfo.SafeLevel);
        userInfo.userKey = Number(userInfo.userKey);

        return userInfo;
    }

    async login(id, password) {
        this.jar.setCookieSync("KeepLoginConfig=" + crypto.randomBytes(4).toString("hex"), "https://m.cultureland.co.kr");
        const transKey = new mTransKey();
        await transKey.getServletData(this.jar);
        await transKey.getKeyData(this.jar);

        const keypad = await transKey.createKeypad(this.jar, "qwerty", "passwd", "passwd", "password");
        const skipData = await keypad.getSkipData();
        const encryptedPassword = keypad.encryptPassword(password, skipData);
        const requestBody = qs.stringify({
            agentUrl: "",
            returnUrl: "",
            keepLoginInfo: "",
            phoneForiOS: "",
            hidWebType: "other",
            bioCheckResult: "",
            browserId: "", // /assets/js/egovframework/com/cland/was/mmb/loginMain.js?version=1.0 LINE 19
            userId: id,
            passwd: "*".repeat(password.length),
            keepLogin: "Y",
            seedKey: transKey.crypto.encSessionKey,
            initTime: transKey.initTime,
            keyIndex_passwd: keypad.keyIndex,
            keyboardType_passwd: "qwertyMobile",
            fieldType_passwd: "password",
            transkeyUuid: transKey.crypto.transkeyUuid,
            transkey_passwd: encryptedPassword,
            transkey_HM_passwd: transKey.crypto.hmacDigest(encryptedPassword)
        });
        const loginRequest = await this.client.post("https://m.cultureland.co.kr/mmb/loginProcess.do", requestBody, {
            headers: {
                "Referer": "https://m.cultureland.co.kr/mmb/loginMain.do"
            },
            maxRedirects: 0,
            validateStatus: status => status === 302
        }).catch(() => { throw new Error("ERR_LOGIN_FAILED"); });
        if (loginRequest.headers["location"] === "https://m.cultureland.co.kr/cmp/authConfirm.do") throw new Error("ERR_LOGIN_RESTRICTED");
        return true;
    }
}

export default Cultureland;