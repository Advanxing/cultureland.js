import axios, { AxiosInstance } from "axios";
import crypto from "crypto";
import { HttpCookieAgent, HttpsCookieAgent } from "http-cookie-agent/http";
import { CookieJar } from "tough-cookie";
import mTransKey from "./mTranskey/transkey.js";
import { parse } from "node-html-parser";
import { KeyStringValueStringObject, CulturelandVoucher, BalanceResponse, CulturelandBalance, PhoneInfoResponse, CulturelandCharge, CulturelandGift, GiftLimitResponse, CulturelandGiftLimit, ChangeCoupangCashResponse, CulturelandChangeCoupangCash, ChangeSmileCashResponse, CulturelandChangeSmileCash, UserInfoResponse, CulturelandUser, CashLogsResponse, CulturelandCashLogs, CulturelandVoucherFormat } from "./types.js";

export default class Cultureland {
    public cookieJar: CookieJar;
    public client: AxiosInstance;
    public constructor() {
        this.cookieJar = new CookieJar();
        this.client = axios.create({
            headers: {
                "User-Agent": "Mozilla/5.0 (Linux; Android 11; SM-G998N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Mobile Safari/537.36",
                "Connection": "keep-alive"
            },
            httpAgent: new HttpCookieAgent({ cookies: { jar: this.cookieJar } }),
            httpsAgent: new HttpsCookieAgent({ cookies: { jar: this.cookieJar } })
        });
    }

    /**
     * 컬쳐랜드상품권(모바일문화상품권)의 정보를 가져옵니다. 로그인이 필요합니다. 계정당 일일 조회수 10회 한도가 있습니다.
     * @param pin 상품권의 핀번호 (4180-XXXX-XXXX-XXXX)
     * @returns `success` 상품권정보 성공여부
     * @returns `data` 상품권정보
     */
    public async checkVoucher(pin: string): Promise<CulturelandVoucher> {
        if (!(await this.isLogin())) throw new Error("로그인이 필요한 서비스 입니다.");

        if (!pin.startsWith("4")) {
            return {
                success: false,
                message: "정확한 모바일 상품권 번호를 입력하세요."
            };
        }

        // 핀번호 포맷 검사
        const pinResult = Cultureland.checkPinFormat(pin);
        if (!pinResult.success) {
            return {
                success: false,
                message: pinResult.message
            };
        }

        const transKey = new mTransKey(this.cookieJar);
        const servletData = await transKey.getServletData();

        // <input type="tel" title="네 번째 6자리 입력" id="input-14" name="culturelandInput">
        const keypad = transKey.createKeypad(servletData, "number", "input-14", "culturelandInput", "tel");
        const keypadLayout = await keypad.getKeypadLayout();
        const encryptedPin = keypad.encryptPassword(pinResult.parts![3], keypadLayout);

        // culturelandInput 실제로 같은 키 4개가 사용되어 그대로 반영하였습니다.
        const payload = [
            [ "culturelandNo", pinResult.parts![0] + pinResult.parts![1] + pinResult.parts![2] ],
            [ "culturelandInput", pinResult.parts![0] ],
            [ "culturelandInput", pinResult.parts![1] ],
            [ "culturelandInput", pinResult.parts![2] ],
            [ "culturelandInput", "*".repeat(pinResult.parts![3].length) ],
            [ "seedKey", transKey.crypto.encSessionKey ],
            [ "initTime", servletData.initTime ],
            [ "keyIndex_input-14", keypad.keyIndex ],
            [ "keyboardType_input-14", keypad.keyboardType + "Mobile" ],
            [ "fieldType_input-14", keypad.fieldType ],
            [ "transkeyUuid", transKey.crypto.transkeyUuid ],
            [ "transkey_input-14", encryptedPin ],
            [ "transkey_HM_input-14", transKey.crypto.hmacDigest(encryptedPin) ]
        ].map(kv => kv.map(encodeURIComponent).join("=")).join("&");

        const voucherData = await this.client.post("https://m.cultureland.co.kr/vchr/getVoucherCheckMobileUsed.json", payload, {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "Referer": "https://m.cultureland.co.kr/vchr/voucherUsageGiftM.do"
            }
        }).then(res => res.data);

        // 일일 조회수를 초과하셨습니다.
        if (voucherData.resultCd === "1") {
            return {
                success: false,
                message: voucherData.resultMsg
            };
        }

        return {
            success: true,
            message: voucherData.resultMsg,
            data: voucherData
        };
    }

    /**
     * 컬쳐랜드 계정의 컬쳐캐쉬 잔액을 가져옵니다.
     * @returns `success` 잔액요청 성공여부
     * @returns `message` 잔액요청 결과 메시지
     * @returns `balance` 사용가능 금액
     * @returns `safeBalance` 보관중인 금액 (안심금고)
     * @returns `totalBalance` 총 잔액
     */
    public async getBalance(): Promise<CulturelandBalance> {
        if (!(await this.isLogin())) throw new Error("로그인이 필요한 서비스 입니다.");

        const balance: BalanceResponse = await this.client.post("https://m.cultureland.co.kr/tgl/getBalance.json").then(res => res.data);

        if (balance.resultMessage !== "성공") {
            return {
                success: false,
                message: balance.resultMessage,
                balance: 0,
                safeBalance: 0,
                totalBalance: 0
            };
        }

        return {
            success: true,
            message: "성공",
            balance: parseInt(balance.blnAmt),
            safeBalance: parseInt(balance.bnkAmt),
            totalBalance: parseInt(balance.myCash)
        };
    }

    /**
     * 컬쳐랜드상품권(모바일문화상품권) 및 문화상품권(18자리)을 컬쳐캐쉬로 충전합니다. 지류/온라인문화상품권(18자리)은 2022.12.31 이전 발행 건만 충전 가능합니다.
     * @param pins 상품권의 핀번호
     * @param checkVoucher 충전 전에 상품권에 잔액이 있는지 확인 (W.I.P)
     * @returns `success` 핀번호 유효성
     * @returns `message` 성공여부
     * @returns `amount` 충전금액
     */
    public async charge(pin: string | string[], checkVoucher = false): Promise<CulturelandCharge> {
        if (!(await this.isLogin())) throw new Error("로그인이 필요한 서비스 입니다.");

        // 핀번호 포맷 검사
        const pinResult = Cultureland.checkPinFormat(typeof pin === "string" ? pin : pin.join(""));
        if (!pinResult.success) {
            return {
                success: false,
                message: pinResult.message
            };
        }

        // 선행 페이지 요청을 보내지 않으면 잘못된 접근 오류 발생
        await this.client.get(
            pinResult.parts![3].length === 4 ?
            "https://m.cultureland.co.kr/csh/cshGiftCard.do" : // 모바일문화상품권
            "https://m.cultureland.co.kr/csh/cshGiftCardOnline.do" // 문화상품권(18자리)
        );

        const transKey = new mTransKey(this.cookieJar);
        const servletData = await transKey.getServletData();

        // <input type="password" name="scr14" id="txtScr14">
        const keypad = transKey.createKeypad(servletData, "number", "txtScr14", "scr14");
        const keypadLayout = await keypad.getKeypadLayout();
        const encryptedPin = keypad.encryptPassword(pinResult.parts![3], keypadLayout);

        const requestBody = new URLSearchParams({
            versionCode: "",
            scr11: pinResult.parts![0],
            scr12: pinResult.parts![1],
            scr13: pinResult.parts![2],
            scr14: "*".repeat(pinResult.parts![3].length),
            seedKey: transKey.crypto.encSessionKey,
            initTime: servletData.initTime,
            keyIndex_txtScr14: keypad.keyIndex,
            keyboardType_txtScr14: keypad.keyboardType + "Mobile",
            fieldType_txtScr14: keypad.fieldType,
            transkeyUuid: transKey.crypto.transkeyUuid,
            transkey_txtScr14: encryptedPin,
            transkey_HM_txtScr14: transKey.crypto.hmacDigest(encryptedPin)
        });

        const chargeRequest = await this.client.post(
            pinResult.parts![3].length === 4 ?
            "https://m.cultureland.co.kr/csh/cshGiftCardProcess.do" : // 모바일문화상품권
            "https://m.cultureland.co.kr/csh/cshGiftCardOnlineProcess.do", // 문화상품권(18자리)
            requestBody.toString(),
            {
                maxRedirects: 0,
                validateStatus: status => status === 302
            }
        );

        const chargeResult: string = await this.client.get("https://m.cultureland.co.kr" + chargeRequest.headers.location)
            .then(res => res.data); // 충전 결과 받아오기

        const chargeData = parse(chargeResult) // 충전 결과 HTML 파싱
            .getElementsByTagName("tbody")[0]
            .getElementsByTagName("tr")[0]
            .getElementsByTagName("td");

        return {
            success: true,
            message: chargeData[2].innerText,
            amount: parseInt(chargeData[3].innerText.replace(/,/g, "").replace("원", ""))
        };
    }

    /**
     * 최대 10개의 컬쳐랜드상품권(모바일문화상품권) 및 문화상품권(18자리)을 컬쳐캐쉬로 충전합니다. 지류/온라인문화상품권(18자리)은 2022.12.31 이전 발행 건만 충전 가능합니다.
     * @param pins 상품권들의 핀번호
     * @param checkVoucher 충전 전에 상품권에 잔액이 있는지 확인 (W.I.P)
     * @returns `success` 핀번호 유효성
     * @returns `message` 성공여부
     * @returns `amount` 충전금액
     */
    public async bulkCharge(pins: string[], checkVoucher = false): Promise<CulturelandCharge[]> {
        if (!(await this.isLogin())) throw new Error("로그인이 필요한 서비스 입니다.");

        // 핀번호 포맷 검사
        let pinResults: CulturelandVoucherFormat[] = [];
        for (const pin of pins) pinResults.push(Cultureland.checkPinFormat(pin));

        // 모든 핀번호가 포맷과 검사를 통과하지 못한 경우
        if (pinResults.every(res => !res.success)) {
            return pinResults.map(res => ({
                success: false,
                message: res.message,
                amount: 0
            }));
        }

        const onlyMobileVouchers = pinResults
            .filter(res => res.success) // 핀번호 포맷 검사를 통과한 상품권 중
            .every(res => res.message[3].length === 4); // 모바일문화상품권만 있는지

        // 선행 페이지 요청을 보내지 않으면 잘못된 접근 오류 발생
        await this.client.get(
            onlyMobileVouchers ?
            "https://m.cultureland.co.kr/csh/cshGiftCard.do" : // 모바일문화상품권
            "https://m.cultureland.co.kr/csh/cshGiftCardOnline.do" // 문화상품권(18자리)
        ); // 문화상품권(18자리)에서 모바일문화상품권도 충전 가능, 모바일문화상품권에서 문화상품권(18자리) 충전 불가능

        const transKey = new mTransKey(this.cookieJar);
        const servletData = await transKey.getServletData();

        let pinCount = 1;
        const scrs: KeyStringValueStringObject = {}; // scr: scratch? screen? | 정확한 정보를 찾을 수 없어 약어 그대로 사용
        const keyboards: KeyStringValueStringObject[] = []; // keyIndex, keyboardType, fieldType
        const transkeys: KeyStringValueStringObject[] = []; // transkey, transkey_HM

        for (const pinResult of pinResults) {
            if (!pinResult.success) continue; // 포맷 검사를 통과하지 못한 경우 건너뛰기

            const scr4 = `scr${pinCount}4`, txtScr4 = `txtScr${pinCount}4`;

            // <input type="password" name="{scr4}" id="{txtScr4}">
            const keypad = transKey.createKeypad(servletData, "number", txtScr4, scr4);
            const keypadLayout = await keypad.getKeypadLayout();
            const encryptedPin = keypad.encryptPassword(pinResult.parts![3], keypadLayout);

            // scr
            scrs[`scr${pinCount}1`] = pinResult.parts![0];
            scrs[`scr${pinCount}2`] = pinResult.parts![1];
            scrs[`scr${pinCount}3`] = pinResult.parts![2];
            scrs[scr4] = "*".repeat(pinResult.parts![3].length);

            // keyboard
            const keyboard: KeyStringValueStringObject = {};
            keyboard["keyIndex_" + txtScr4] = keypad.keyIndex;
            keyboard["keyboardType_" + txtScr4] = keypad.keyboardType + "Mobile";
            keyboard["fieldType_" + txtScr4] = keypad.fieldType;
            keyboards.push(keyboard);

            // transkey
            const transkey: KeyStringValueStringObject = {};
            transkey["transkey_" + txtScr4] = encryptedPin;
            transkey["transkey_HM_" + txtScr4] = transKey.crypto.hmacDigest(encryptedPin);
            transkeys.push(transkey);

            pinCount++;
        }

        let requestBody: KeyStringValueStringObject = {
            versionCode: "",
            ...scrs,
            seedKey: transKey.crypto.encSessionKey,
            initTime: servletData.initTime,
            ...keyboards.shift(),
            transkeyUuid: transKey.crypto.transkeyUuid, // WHY HERE?
            ...transkeys.shift()
        };

        for (let i = 0; i < keyboards.length; i++) {
            const keyboard = keyboards[i];
            const transkey = transkeys[i];

            requestBody = {
                ...requestBody,
                ...keyboard,
                ...transkey
            };
        }

        const chargeRequest = await this.client.post(
            onlyMobileVouchers ?
            "https://m.cultureland.co.kr/csh/cshGiftCardProcess.do" : // 모바일문화상품권
            "https://m.cultureland.co.kr/csh/cshGiftCardOnlineProcess.do", // 문화상품권(18자리)
            new URLSearchParams(requestBody).toString(),
            {
                maxRedirects: 0,
                validateStatus: status => status === 302
            }
        );

        const chargeResults = await this.client.get("https://m.cultureland.co.kr" + chargeRequest.headers.location)
            .then(res => res.data); // 충전 결과 받아오기

        const parsedResults = parse(chargeResults) // 충전 결과 HTML 파싱
            .getElementsByTagName("tbody")[0]
            .getElementsByTagName("tr");

        let resultCount = 0;
        const results: CulturelandCharge[] = [];

        for (const pinResult of pinResults) {
            if (!pinResult.success) {
                results.push({
                    success: false,
                    message: pinResult.message,
                    amount: 0
                });
                continue;
            }

            const chargeResult = parsedResults[resultCount++].getElementsByTagName("td");

            results.push({
                success: true,
                message: chargeResult[2].innerText,
                amount: parseInt(chargeResult[3].innerText.replace(/,/g, "").replace("원", ""))
            });
        }

        return results;
    }

    /**
     * 컬쳐캐쉬를 사용해 컬쳐랜드상품권(모바일문화상품권)을 본인번호로 선물합니다.
     * @param amount 구매금액 (최소 1천원부터 최대 5만원까지 100원 단위로 입력 가능)
     * @param quantity 구매수량 (최대 5개)
     * @returns `success` 선물 성공여부
     * @returns `message` 선물 메시지
     * @returns `pin` 선물 바코드번호
     * @returns `url` 선물 바코드 URL
     */
    public async gift(amount: number, quantity = 1): Promise<CulturelandGift> {
        if (!(await this.isLogin())) throw new Error("로그인이 필요한 서비스 입니다.");

        // 유저정보 가져오기 (선물구매에 userKey 필요)
        const userInfo = await this.getUserInfo();
        if (!userInfo.success) {
            return {
                success: false,
                message: userInfo.message
            };
        }

        // 선행 페이지 요청을 보내지 않으면 잘못된 접근 오류 발생
        await this.client.get("https://m.cultureland.co.kr/gft/gftPhoneApp.do");

        // 내폰으로 전송 (본인번호 가져옴)
        const phoneInfo: PhoneInfoResponse = await this.client.post("https://m.cultureland.co.kr/cpn/getGoogleRecvInfo.json", new URLSearchParams({
            sendType: "LMS",
            recvType: "M",
            cpnType: "GIFT"
        }).toString(), {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "Referer": "https://m.cultureland.co.kr/gft/gftPhoneApp.do"
            }
        }).then(res => res.data);

        if (phoneInfo.errMsg !== "정상") {
            return {
                success: false,
                message: phoneInfo.errMsg
            };
        }

        const sendGift = await this.client.post("https://m.cultureland.co.kr/gft/gftPhoneCashProc.do", new URLSearchParams({
            revEmail: "",
            sendType: "S",
            userKey: userInfo.userKey!.toString(),
            limitGiftBank: "N",
            bankRM: "OK",
            giftCategory: "M",
            quantity: quantity.toString(),
            amount: amount.toString(),
            chkLms: "M",
            revPhone: phoneInfo.hpNo1 + phoneInfo.hpNo2 + phoneInfo.hpNo3,
            paymentType: "cash",
            agree: "on"
        }).toString(), {
            maxRedirects: 0,
            validateStatus: status => status === 302
        });

        const giftResult: string = await this.client.get("https://m.cultureland.co.kr" + sendGift.headers.location).then(res => res.data);

        if (giftResult.includes("<strong> 컬쳐랜드상품권(모바일문화상품권) 선물(구매)가<br />완료되었습니다.</strong>")) {
            // 바코드의 코드 (URL 쿼리: code)
            const barcodeCode = giftResult.match(/<input type="hidden" id="barcodeImage"      name="barcodeImage"       value="https:\/\/m\.cultureland\.co\.kr\/csh\/mb\.do\?code=([\w/+=]+)" \/>/)?.[1];
            if (!barcodeCode) {
                return {
                    success: false,
                    message: "컬쳐랜드상품권(모바일문화상품권) 선물(구매)가 실패 하였습니다."
                };
            }

            // 핀번호(바코드번호)를 가져오기 위해 바코드 정보 요청
            const barcodeURL = "https://m.cultureland.co.kr/csh/mb.do?code=" + barcodeCode;
            const barcodeData: string = await this.client.get(barcodeURL).then(res => res.data);

            // 핀번호(바코드번호)
            const pinCode: string = barcodeData
                .split("<span>바코드번호</span>")[1]
                .split("</span>")[0]
                .split("<span>")[1];

            return {
                success: true,
                message: "컬쳐랜드상품권(모바일문화상품권) 선물(구매)가 완료되었습니다.",
                pin: pinCode,
                url: barcodeURL
            };
        }

        const failReason = giftResult.match(/<dt class="two">실패 사유 <span class="right">(.*)<\/span><\/dt>/)?.[1]?.replace(/<br>/g, " ");

        return {
            success: false,
            message: failReason ?? "컬쳐랜드상품권(모바일문화상품권) 선물(구매)가 실패 하였습니다."
        };
    }

    /**
     * 선물하기 API에서 선물한도를 가져옵니다.
     * @returns `success` 선물한도 성공여부
     * @returns `message` 선물한도 메시지
     * @returns `remain` 잔여 선물한도
     * @returns `limit` 최대 선물한도
     */
    public async getGiftLimit(): Promise<CulturelandGiftLimit> {
        if (!(await this.isLogin())) throw new Error("로그인이 필요한 서비스 입니다.");

        const limitInfo: GiftLimitResponse = await this.client.post("https://m.cultureland.co.kr/gft/chkGiftLimitAmt.json").then(res => res.data);

        if (limitInfo.errMsg !== "정상") {
            return {
                success: false,
                message: limitInfo.errMsg
            };
        }

        return {
            success: true,
            message: "정상",
            remain: limitInfo.giftVO.ccashRemainAmt,
            limit: limitInfo.giftVO.ccashLimitAmt
        };
    }

    /**
     * 컬쳐캐쉬를 쿠팡캐시로 전환합니다. 휴대폰본인인증회원만 이용 가능합니다. 고객 부담 전환 수수료 6% 차감됩니다. 일 최대 10회 전환 가능합니다.
     * @param amount 전환금액 (최소 1천원부터 월 최대 10만원까지 100원 단위로 입력 가능)
     */
    public async changeCoupangCash(amount: number): Promise<CulturelandChangeCoupangCash> {
        if (!(await this.isLogin())) throw new Error("로그인이 필요한 서비스 입니다.");

        const changeCoupangPage: string = await this.client.get("https://m.cultureland.co.kr/chg/chgCoupangChange.do").then(res => res.data);

        // 잔여 쿠팡캐시 전환한도
        const possibleAmount = changeCoupangPage.match(/<input type="hidden" name="PossibleAmount" id="PossibleAmount" value="(\d+)">/)?.[1] || "106300";

        const changeCoupangCash: ChangeCoupangCashResponse = await this.client.post("https://m.cultureland.co.kr/chg/chgSmileCashChangeProc.json", new URLSearchParams({
            changeAmount: (amount * 0.94).toString(),
            amount: amount.toString(),
            feeAmount: (amount * 0.06).toString(),
            freefeeAmount: "0",
            eventCode: "",
            PossibleAmount: possibleAmount
        }).toString(), {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "Referer": "https://m.cultureland.co.kr/chg/chgCoupangChange.do"
            }
        }).then(res => res.data);

        return {
            success: changeCoupangCash.resultCd === "0000",
            message: changeCoupangCash.resultMsg
        };
    }

    /**
     * 컬쳐캐쉬를 스마일캐시로 전환합니다. 휴대폰본인인증회원만 이용 가능합니다. 고객 부담 전환 수수료 5% 과금됩니다.
     * @param amount 전환금액 (최소 1천원부터 월 최대 200만원까지 100원 단위로 입력 가능)
     */
    public async changeSmileCash(amount: number): Promise<CulturelandChangeSmileCash> {
        if (!(await this.isLogin())) throw new Error("로그인이 필요한 서비스 입니다.");

        const changeSmileCash: ChangeSmileCashResponse = await this.client.post("https://m.cultureland.co.kr/chg/chgSmileCashChangeProc.json", new URLSearchParams({
            changeAmount: amount.toString(),
            amount: (amount * 1.05).toString(),
            feeAmount: (amount * 0.05).toString(),
            freefeeAmount: "0",
            eventCode: ""
        }).toString(), {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "Referer": "https://m.cultureland.co.kr/chg/chgSmileCashChange.do"
            }
        }).then(res => res.data);

        return {
            success: changeSmileCash.resultCd === "0000",
            message: changeSmileCash.resultMsg
        };
    }

    /**
     * 안심금고 API에서 유저정보를 가져옵니다.
     * @returns `success` 유저정보 성공여부
     * @returns `message` 유저정보 메시지
     * @returns `phone` 휴대폰 번호
     * @returns `safeLevel` 안심금고 레벨
     * @returns `safePassword` 안심금고 비밀번호 여부
     * @returns `registerDate` 가입일 (yyyy-MM-dd HH:mm:ss.SSS)
     * @returns `userId` 컬쳐랜드 ID
     * @returns `userKey` 유저 고유 번호
     * @returns `userIp` 접속 IP
     * @returns `index` 유저 고유 인덱스
     * @returns `category` 유저 종류
     */
    public async getUserInfo(): Promise<CulturelandUser> {
        if (!(await this.isLogin())) throw new Error("로그인이 필요한 서비스 입니다.");

        const userInfo: UserInfoResponse = await this.client.post("https://m.cultureland.co.kr/tgl/flagSecCash.json").then(res => res.data);

        if (userInfo.resultMessage !== "성공") {
            return {
                success: false,
                message: userInfo.resultMessage
            };
        }

        return {
            success: true,
            message: "성공",
            phone: userInfo.Phone,
            safeLevel: parseInt(userInfo.SafeLevel),
            safePassword: userInfo.CashPwd !== "0",
            registerDate: userInfo.RegDate,
            userId: userInfo.userId,
            userKey: userInfo.userKey,
            userIp: userInfo.userIp,
            index: parseInt(userInfo.idx),
            category: userInfo.category
        };
    }

    /**
     * 컬쳐캐쉬 충전 / 사용 내역을 가져옵니다.
     * @param days 조회 일수
     * @param pageSize 한 페이지에 담길 로그 수 (default: 20)
     * @param page 페이지 (default: 1)
     * @returns `success` 조회 성공여부
     * @returns `message` 조회 메시지
     * @returns `logs` 조회 로그
     * @returns `logs.title` 내역 제목
     * @returns `logs.merchantCode` 사용가맹점 코드
     * @returns `logs.merchantName` 사용가맹점 이름
     * @returns `logs.amount` 사용금액
     * @returns `logs.balance` 사용 후 남은 잔액
     * @returns `logs.spendType` 사용 종류 (사용, 사용취소, 충전)
     * @returns `logs.timestamp` 내역 시간
     */
    public async getCultureCashLogs(days: number, pageSize = 20, page = 1): Promise<CulturelandCashLogs> {
        if (!(await this.isLogin())) throw new Error("로그인이 필요한 서비스 입니다.");

        const cashLogs: CashLogsResponse = await this.client.post("https://m.cultureland.co.kr/tgl/cashList.json", new URLSearchParams({
            addDay: (days - 1).toString(),
            pageSize: pageSize.toString(),
            page: page.toString()
        }).toString(), {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "Referer": "https://m.cultureland.co.kr/tgl/cashSearch.do"
            }
        }).then(res => res.data);

        return {
            success: true,
            message: "성공",
            logs: cashLogs.map(log => ({
                title: log.item.Note,
                merchantCode: log.item.memberCode,
                merchantName: log.item.memberName,
                amount: parseInt(log.item.inAmount) - parseInt(log.item.outAmount),
                balance: parseInt(log.item.balance),
                spendType: log.item.accType,
                timestamp: Date.parse(log.item.accDate.replace(/(\d{4})(\d{2})(\d{2})/g, "$1-$2-$3") + " " + log.item.accTime.replace(/(\d{2})(\d{2})(\d{2})/g, "$1:$2:$3"))
            }))
        };
    }

    /**
     * 현재 세션이 컬쳐랜드에 로그인되어 있는지 확인합니다.
     * @returns 로그인 여부
     */
    public async isLogin() {
        const isLogin: boolean = await this.client.post("https://m.cultureland.co.kr/mmb/isLogin.json").then(res => res.data).catch(() => false);
        return isLogin;
    }

    /**
     * ID와 PW로 컬쳐랜드에 로그인합니다.
     * @param id 컬쳐랜드 ID
     * @param password 컬쳐랜드 PW
     * @param browserId 브라우저 아이디 `/assets/js/egovframework/com/cland/was/mmb/loginMain.js?version=1.0` L19
     * @param macAddress 맥 주소 `/assets/js/egovframework/com/cland/was/mmb/loginMain.js?version=1.0` L28
     * @returns `success` 로그인 성공여부
     * @returns `message` 로그인 메시지
     * @returns `keepLoginConfig` 로그인 유지 쿠키
     */
    public async login(id: string, password: string, browserId?: string, macAddress?: string) {
        if (!macAddress) {
            macAddress = await this.client.post("https://m.cultureland.co.kr/mmb/macAddrSelect.json", "flag=newMacAddr", {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                    "Referer": "https://m.cultureland.co.kr/mmb/loginMain.do"
                }
            }).then(res => res.data.newMacAddr);
        }

        const transKey = new mTransKey(this.cookieJar);
        const servletData = await transKey.getServletData();

        const keypad = transKey.createKeypad(servletData, "qwerty", "passwd", "passwd");
        const keypadLayout = await keypad.getKeypadLayout();
        const encryptedPassword = keypad.encryptPassword(password, keypadLayout);

        const requestBody = new URLSearchParams({
            agentUrl: "",
            returnUrl: "",
            keepLoginInfo: "",
            phoneForiOS: "",
            hidWebType: "other",
            bioCheckResult: "",
            browserId: browserId ?? crypto.randomBytes(16).toString("hex"),
            newMacAddr: macAddress ?? crypto.randomBytes(15).toString("hex").toUpperCase(),
            userId: id,
            passwd: "*".repeat(password.length),
            keepLogin: "Y",
            seedKey: transKey.crypto.encSessionKey,
            initTime: servletData.initTime,
            keyIndex_passwd: keypad.keyIndex,
            keyboardType_passwd: keypad.keyboardType + "Mobile",
            fieldType_passwd: keypad.fieldType,
            transkeyUuid: transKey.crypto.transkeyUuid,
            transkey_passwd: encryptedPassword,
            transkey_HM_passwd: transKey.crypto.hmacDigest(encryptedPassword)
        }).toString();

        const loginRequest = await this.client.post("https://m.cultureland.co.kr/mmb/loginProcess.do", requestBody, {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Referer": "https://m.cultureland.co.kr/mmb/loginMain.do"
            },
            maxRedirects: 0,
            validateStatus: status => status === 302
        }).catch(() => null);

        if (!loginRequest) {
            return {
                success: false,
                message: "입력하신 아이디 또는 비밀번호가 틀립니다"
            };
        }

        // 로그인을 시도한 아이피 대역이 컬쳐랜드 정책에 의해 차단된 경우
        if (loginRequest.headers.location === "/cmp/authConfirm.do") throw new Error("컬쳐랜드 로그인 정책에 따라 로그인이 제한되었습니다. (제한코드 23)");

        const keepLoginConfigCookie = loginRequest.headers["set-cookie"]?.find(cookie => cookie.startsWith("KeepLoginConfig="));

        if (keepLoginConfigCookie) {
            const keepLoginConfig = keepLoginConfigCookie.split("=")[1].split(";")[0];
            return {
                success: true,
                message: "성공",
                keepLoginConfig
            };
        }
        else {
            return {
                success: true,
                message: "성공"
            };
        }
    }

    /**
     * 로그인 유지 쿠키로 컬쳐랜드에 로그인합니다.
     * @param keepLoginConfig 로그인 유지 쿠키 `keepLoginConfig`
     * @param browserId 브라우저 아이디 `/assets/js/egovframework/com/cland/was/mmb/loginMain.js?version=1.0` L19
     * @param macAddress 맥 주소 `/assets/js/egovframework/com/cland/was/mmb/loginMain.js?version=1.0` L28
     * @returns `success` 로그인 성공여부
     * @returns `message` 로그인 메시지
     * @returns `userId` 컬쳐랜드 ID
     * @returns `keepLoginConfig` 로그인 유지 쿠키
     */
    public async loginWithKeepLoginConfig(keepLoginConfig: string, browserId?: string, macAddress?: string) {
        await this.cookieJar.setCookie("KeepLoginConfig=" + keepLoginConfig, "https://m.cultureland.co.kr");

        const loginMain: string = await this.client.get("https://m.cultureland.co.kr/mmb/loginMain.do", {
            headers: {
                "Referer": "https://m.cultureland.co.kr/index.do"
            }
        }).then(res => res.data);

        const userId = loginMain.match(/<input type="text" id="txtUserId" name="userId" value="(\w*)" maxlength="12" oninput="maxLengthCheck\(this\);" placeholder="아이디" >/)?.[1] ?? "";

        if (!userId) {
            return {
                success: false,
                message: "입력하신 아이디 또는 비밀번호가 틀립니다"
            };
        }

        if (!macAddress) {
            macAddress = await this.client.post("https://m.cultureland.co.kr/mmb/macAddrSelect.json", "flag=newMacAddr", {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                    "Referer": "https://m.cultureland.co.kr/mmb/loginMain.do"
                }
            }).then(res => res.data.newMacAddr);
        }

        const transKey = new mTransKey(this.cookieJar);
        const servletData = await transKey.getServletData();

        const keypad = transKey.createKeypad(servletData, "qwerty", "passwd", "passwd");
        const keypadLayout = await keypad.getKeypadLayout();
        const encryptedPassword = keypad.encryptPassword("", keypadLayout);

        const loginRequest = await this.client.post("https://m.cultureland.co.kr/mmb/loginProcess.do", new URLSearchParams({
            agentUrl: "",
            returnUrl: "",
            keepLoginInfo: keepLoginConfig,
            phoneForiOS: "",
            hidWebType: "",
            bioCheckResult: "",
            browserId: browserId ?? crypto.randomBytes(16).toString("hex"),
            newMacAddr: macAddress ?? crypto.randomBytes(15).toString("hex").toUpperCase(),
            userId,
            keepLogin: "Y",
            seedKey: transKey.crypto.encSessionKey,
            initTime: servletData.initTime,
            keyIndex_passwd: keypad.keyIndex,
            keyboardType_passwd: keypad.keyboardType + "Mobile",
            fieldType_passwd: keypad.fieldType,
            transkeyUuid: transKey.crypto.transkeyUuid,
            transkey_passwd: encryptedPassword,
            transkey_HM_passwd: transKey.crypto.hmacDigest(encryptedPassword)
        }).toString(), {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Referer": "https://m.cultureland.co.kr/mmb/loginMain.do"
            },
            maxRedirects: 0,
            validateStatus: status => status === 302
        }).catch(() => null);

        if (!loginRequest) {
            return {
                success: false,
                message: "입력하신 아이디 또는 비밀번호가 틀립니다"
            };
        }

        // 로그인을 시도한 아이피 대역이 컬쳐랜드 정책에 의해 차단된 경우
        if (loginRequest.headers.location === "/cmp/authConfirm.do") throw new Error("컬쳐랜드 로그인 정책에 따라 로그인이 제한되었습니다. (제한코드 23)");

        const keepLoginConfigCookie = loginRequest.headers["set-cookie"]?.find(cookie => cookie.startsWith("KeepLoginConfig="));

        if (keepLoginConfigCookie) {
            const keepLoginConfig = keepLoginConfigCookie.split("=")[1].split(";")[0];
            return {
                success: true,
                message: "성공",
                userId,
                keepLoginConfig
            };
        }
        else {
            return {
                success: true,
                message: "성공",
                userId
            };
        }
    }

    /**
     * 핀번호의 유효성을 검증합니다. 존재할 수 없는 핀번호를 검사하여 불필요한 요청을 사전에 방지합니다.
     * @param pin 상품권의 핀번호
     * @param customMessage 핀번호 검증에 실패하였을 경우 반환하는 메시지
     * @returns `success` 핀번호 유효성
     * @returns `message` 핀번호 검증 메시지
     * @returns `parts` 핀번호 부분 (["XXXX", "XXXX", "XXXX", "XXXX??"])
     */
    public static checkPinFormat(pin: string, customMessage = "상품권 번호 불일치"): CulturelandVoucherFormat {
        const pinMatches = pin.match(/(\d{4})\D*(\d{4})\D*(\d{4})\D*(\d{6}|\d{4})/);
        if (!pinMatches) { // 핀번호 regex에 맞지 않는다면 검증 실패
            return {
                success: false,
                message: customMessage
            };
        }

        const parts: [string, string, string, string] = [ pinMatches[1], pinMatches[2], pinMatches[3], pinMatches[4] ];
        if (parts[0].startsWith("416") || parts[0].startsWith("4180")) { // 핀번호가 416(컬쳐랜드상품권 구권) 또는 4180(컬쳐랜드상품권 신권)으로 시작한다면
            if (parts[3].length !== 4) { // 마지막 핀번호 부분이 4자리가 아니라면 검증 실패
                return {
                    success: false,
                    message: customMessage
                };
            }
        }
        else if (parts[0].startsWith("41")) { // 핀번호가 41로 시작하지만 416 또는 4180으로 시작하지 않는다면 검증 실패
            return {
                success: false,
                message: customMessage
            };
        }
        else if (
            ["2", "3", "4", "5"].includes(parts[0].charAt(0)) && // 핀번호가 2, 3, 4, 5로 시작하고
            ["0", "1", "2", "3", "4", "5"].includes(parts[0].charAt(1)) // 핀번호의 2번째 글자가 0, 1, 2, 3, 4, 5라면
            ) {
            if (parts[3].length === 6) { // 마지막 핀번호 부분이 6자리가 아니라면 검증 실패
                return {
                    success: false,
                    message: customMessage
                };
            }
        }
        else { // 위 조건에 하나도 맞지 않는 경우 검증 실패
            return {
                success: false,
                message: customMessage
            };
        }

        // 검증 성공
        return {
            success: true,
            message: "성공",
            parts: parts
        };
    }
}