const fetch = require("node-fetch");
const mTransKey = require("./transkey");

class cultureland {
    constructor() {
        this.cookies = [];
    }

    async check(pin, isMobile = true) {
        const voucherData = await fetch(`https://www.cultureland.co.kr/voucher/getVoucherCheck${isMobile ? "Mobile" : ""}Used.do`, {
            headers: {
                "content-type": "application/x-www-form-urlencoded"
            },
            method: "POST",
            body: "code=" + pin
        }).then(res => res.json());

        return voucherData;
    }

    async balance() {
        if (!this.isLogin()) throw new Error("ERR_LOGIN_REQUIRED");

        const balance = await fetch("https://m.cultureland.co.kr/tgl/getBalance.json", {
            headers: {
                "cookie": this.cookies.join("; ")
            },
            method: "POST"
        }).then(res => res.json());

        if (balance.resultMessage !== "성공") throw new Error("ERR_BALANCE_FAILED");

        for (const key in balance) {
            if (!isNaN(balance[key])) balance[key] = Number(balance[key]);
        }

        return balance;
    }

    async charge(pin, check = true) {
        if (!this.isLogin()) throw new Error("ERR_LOGIN_REQUIRED");

        if (check) {
            const voucherData = await this.check(pin);
            console.log(voucherData);

            // TODO: validate voucher codes
        }

        pin = pin.split("-");

        const pageRequest = await fetch(pin[3].length === 4 ? "https://m.cultureland.co.kr/csh/cshGiftCard.do" : "https://m.cultureland.co.kr/csh/cshGiftCardOnline.do", {
            headers: {
                cookie: this.cookies.join("; ")
            }
        });

        for (const cookie of pageRequest.headers.raw()["set-cookie"]) {
            const cookieIndex = this.cookies.findIndex(c => c.startsWith(cookie.split("=")[0]));
            if (cookieIndex) this.cookies[cookieIndex] = cookie.split(";")[0];
            else this.cookies.push(cookie.split(";")[0]);
        }

        const transKey = new mTransKey();
        await transKey.getServletData(this.cookies);
        await transKey.getKeyData(this.cookies);

        const keypad = await transKey.createKeypad(this.cookies, "number", "txtScr14", "scr14", "password");
        const encryptedPin = keypad.encryptPassword(pin[3], transKey.initTime, transKey.genKey);

        const requestBody = `versionCode=&scr11=${pin[0]}&scr12=${pin[1]}&scr13=${pin[2]}&scr14=${"*".repeat(pin[3].length)}&seedKey=${transKey.crypto.encSessionKey}&initTime=${transKey.initTime}&keyIndex_txtScr14=${keypad.keyIndex}&keyboardType_txtScr14=numberMobile&fieldType_txtScr14=password&transkeyUuid=${transKey.crypto.transkeyUuid}&transkey_txtScr14=${encodeURIComponent(encryptedPin)}&transkey_HM_txtScr14=${transKey.crypto.hmacDigest(encryptedPin)}`;
        const chargeRequest = await fetch(pin[3].length === 4 ? "https://m.cultureland.co.kr/csh/cshGiftCardProcess.do" : "https://m.cultureland.co.kr/csh/cshGiftCardOnlineProcess.do", {
            headers: {
                "content-type": "application/x-www-form-urlencoded",
                cookie: this.cookies.join("; ")
            },
            method: "POST",
            redirect: "manual",
            body: requestBody
        });

        for (const cookie of chargeRequest.headers.raw()["set-cookie"]) {
            const cookieIndex = this.cookies.findIndex(c => c.startsWith(cookie.split("=")[0]));
            if (cookieIndex) this.cookies[cookieIndex] = cookie.split(";")[0];
            else this.cookies.push(cookie.split(";")[0]);
        }

        if (chargeRequest.status !== 302) throw new Error("ERR_CHARGE_FAILED");

        const chargeResult = await fetch("https://m.cultureland.co.kr/csh/cshGiftCardCfrm.do", {
            headers: {
                cookie: this.cookies.join("; ")
            }
        }).then(res => res.text());
        
        const chargeData = chargeResult.split("<tbody>")[1].split("<td>");
        const reason = chargeData[3].split("</td>")[0];
        const amount = chargeData[4].split("</td>")[0].trim().replace("원", "");

        return {
            amount,
            reason
        };
    }

    async gift(amount, quantity, phone) {
        if (!this.isLogin()) throw new Error("ERR_LOGIN_REQUIRED");

        await fetch("https://m.cultureland.co.kr/gft/gftPhoneApp.do", {
            headers: {
                cookie: this.cookies.join("; ")
            }
        });

        const giftRequest = fetch("https://m.cultureland.co.kr/gft/gftPhoneCashProc.do", {
            headers: {
                cookie: this.cookies.join("; "),
                "content-type": "application/x-www-form-urlencoded"
            },
            method: "POST",
            redirect: "manual",
            body: `revEmail=&sendType=S&userKey=${user_key}&limitGiftBank=N&giftCategory=M&amount=${amount}&quantity=${quantity}&revPhone=${phone}&sendTitl=&paymentType=cash`
        });

        if (giftRequest.status !== 302) throw new Error("ERR_GIFT_FAILED");

        const giftResult = await fetch("https://m.cultureland.co.kr/gft/gftPhoneCfrm.do", {
            headers: {
                cookie: this.cookies.join("; ")
            }
        }).then(res => res.text());

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
        const isLogin = await fetch("https://m.cultureland.co.kr/mmb/isLogin.json", {
            headers: {
                cookie: this.cookies.join("; ")
            },
            method: "POST"
        }).then(res => res.text());

        return Boolean(isLogin);
    }

    async getUserInfo() {
        if (!this.isLogin()) throw new Error("ERR_LOGIN_REQUIRED");

        const userInfo = await fetch("https://m.cultureland.co.kr/tgl/flagSecCash.json", {
            headers: {
                cookie: this.cookies.join("; ")
            },
            method: "POST"
        }).then(res => res.json());

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

    async login(keepLoginInfo) {
        keepLoginInfo = encodeURIComponent(keepLoginInfo);
        this.cookies.push("KeepLoginConfig=" + keepLoginInfo);
        const loginRequest = await fetch("https://m.cultureland.co.kr/mmb/loginProcess.do", {
            headers: {
                "content-type": "application/x-www-form-urlencoded",
                cookie: this.cookies.join("; ")
            },
            method: "POST",
            redirect: "manual",
            body: "keepLoginInfo=" + keepLoginInfo
        });

        this.cookies = loginRequest.headers.raw()["set-cookie"].map(c => c.split(";")[0]);

        if (loginRequest.status !== 302) throw new Error("ERR_LOGIN_FAILED");

        return {
            sessionId: this.cookies.find(c => c.startsWith("JSESSIONID=")).split("=")[1]
        };
    }
}

module.exports = cultureland;