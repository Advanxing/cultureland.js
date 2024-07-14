import axios, { AxiosProxyConfig } from "axios";
import crypto from "crypto";
import { HttpCookieAgent, HttpsCookieAgent } from "http-cookie-agent/http";
import { parse } from "node-html-parser";
import { Cookie, CookieJar } from "tough-cookie";
import pkg from "../package.json";
import CulturelandError from "./CulturelandError.js";
import mTransKey from "./mTranskey/Transkey.js";
import Pin from "./Pin.js";
import { BalanceResponse, CashLogsResponse, ChangeCoupangCashResponse, ChangeSmileCashResponse, CulturelandBalance, CulturelandCashLog, CulturelandChangeCoupangCash, CulturelandChangeSmileCash, CulturelandCharge, CulturelandGift, CulturelandGiftLimit, CulturelandGooglePlay, CulturelandLogin, CulturelandMember, CulturelandUser, CulturelandVoucher, GiftLimitResponse, GooglePlayBuyResponse, GooglePlayHistoryResponse, PhoneInfoResponse, UserInfoResponse, VoucherResponse, VoucherResultOther } from "./types.js";
import { randomString } from "./utils.js";

export class Cultureland {
    public cookieJar = new CookieJar();
    public client = axios.create({
        headers: {
            "User-Agent": `cultureland.js/${pkg.version} (+${pkg.repository.url})`
        },
        httpAgent: new HttpCookieAgent({ cookies: { jar: this.cookieJar } }),
        httpsAgent: new HttpsCookieAgent({ cookies: { jar: this.cookieJar } })
    });

    /**
     * 컬쳐랜드 모바일웹을 자동화해주는 비공식 라이브러리입니다.
     * 로그인, 잔액조회, 충전, 선물, 전환 등 자주 사용되는 대부분의 기능을 지원합니다.
     * @param proxy 로그인 시 사용할 프록시
     * @example
     * // 프록시 미사용
     * const client = new Cultureland();
     * 
     * // 프록시 사용
     * const proxiedClient = new Cultureland({ host: "localhost", port: 3000 });
     */
    public constructor(public proxy?: AxiosProxyConfig) { }

    /**
     * 컬쳐랜드상품권(모바일문화상품권, 16자리)의 정보를 가져옵니다.
     * 로그인이 필요합니다.
     * 계정당 일일 조회수 10회 한도가 있습니다.
     * @param pin 상품권의 핀번호
     * @example
     * await client.checkVoucher(new Pin("3110-0123-4567-8901"));
     * @returns 상품권 조회 결과
     */
    public async checkVoucher(pin: Pin): Promise<CulturelandVoucher> {
        if (!(await this.isLogin())) throw new CulturelandError("LoginRequiredError", "로그인이 필요한 서비스 입니다.");

        // 핀번호가 유효하지 않거나 41로 시작하지 않거나 311~319로 시작하지 않는다면 리턴
        // /assets/js/egovframework/com/cland/was/util/ClandCmmUtl.js L1281
        if (!pin.parts || !(pin.parts[0].startsWith("41") || /^31[1-9]/.test(pin.parts[0]))) throw new CulturelandError("InvalidPinError", "정확한 모바일 상품권 번호를 입력하세요.");

        const transKey = new mTransKey(this.cookieJar);
        const servletData = await transKey.getServletData();

        // <input type="tel" title="네 번째 6자리 입력" id="input-14" name="culturelandInput">
        const keypad = transKey.createKeypad(servletData, "number", "input-14", "culturelandInput", "tel");
        const keypadLayout = await keypad.getKeypadLayout();
        const encryptedPin = keypad.encryptPassword(pin.parts[3], keypadLayout);

        // culturelandInput 실제로 같은 키 4개가 사용되어 그대로 반영하였습니다.
        const payload = new URLSearchParams({
            "culturelandNo": pin.parts[0] + pin.parts[1] + pin.parts[2],
            "seedKey": transKey.encryptedSessionKey,
            "initTime": servletData.initTime,
            "keyIndex_input-14": keypad.keyIndex,
            "keyboardType_input-14": keypad.keyboardType + "Mobile",
            "fieldType_input-14": keypad.fieldType,
            "transkeyUuid": transKey.transkeyUuid,
            "transkey_input-14": encryptedPin.encrypted,
            "transkey_HM_input-14": encryptedPin.encryptedHmac
        });

        const voucherDataRequest = await this.client.post("https://m.cultureland.co.kr/vchr/getVoucherCheckMobileUsed.json", payload, {
            headers: {
                "Referer": "https://m.cultureland.co.kr/vchr/voucherUsageGiftM.do"
            }
        });

        const voucherData: VoucherResponse = voucherDataRequest.data;

        if (voucherData.resultCd !== "0") {
            if (voucherData.resultCd === "1") {
                throw new CulturelandError("LookupError", "일일 조회수를 초과하셨습니다.");
            } else if (voucherData.resultMsg) {
                console.log(voucherData.resultMsg);
                throw new CulturelandError("LookupError", "Unknown.");
            } else {
                throw new CulturelandError("ResponseError", "잘못된 응답이 반환되었습니다.");
            }
        }

        const resultOther: VoucherResultOther = JSON.parse(voucherData.resultOther);

        return {
            amount: resultOther[0].FaceValue,
            balance: resultOther[0].Balance,
            certNo: resultOther[0].CertNo,
            createdDate: resultOther[0].RegDate,
            expiryDate: resultOther[0].ExpiryDate,
            spendHistory: voucherData.resultMsg.map(res => ({
                title: res.item.GCSubMemberName,
                merchantName: res.item.Store_name,
                amount: parseInt(res.item.levyamount),
                timestamp: Date.parse(res.item.LevyDate.replace(/^(\d{6})/g, "$1 ") + res.item.LevyTime.replace(/(\d{2})(\d{2})(\d{2})/, " $1:$2:$3"))
            }))
        };
    }

    /**
     * 컬쳐랜드 계정의 컬쳐캐쉬 잔액을 가져옵니다.
     * @example
     * await client.getBalance();
     * @returns 보유 잔액 정보
     */
    public async getBalance(): Promise<CulturelandBalance> {
        if (!(await this.isLogin())) throw new CulturelandError("LoginRequiredError", "로그인이 필요한 서비스 입니다.");

        const balanceRequest = await this.client.post("https://m.cultureland.co.kr/tgl/getBalance.json");

        const balance: BalanceResponse = balanceRequest.data;
        if (balance.resultMessage !== "성공") {
            if (balance.resultMessage) throw new CulturelandError("LookupError", balance.resultMessage);
            else throw new CulturelandError("ResponseError", "잘못된 응답이 반환되었습니다.");
        }

        return {
            balance: parseInt(balance.blnAmt),
            safeBalance: parseInt(balance.bnkAmt),
            totalBalance: parseInt(balance.myCash)
        };
    }

    /**
     * 컬쳐랜드상품권(모바일문화상품권) 및 문화상품권(18자리)을 컬쳐캐쉬로 충전합니다.
     * 지류/온라인문화상품권(18자리)은 2022.12.31 이전 발행 건만 충전 가능합니다.
     * @param pin 상품권(들)의 핀번호
     * @example
     * // 한 개의 핀번호 충전
     * await client.charge(new Pin("3110-0123-4567-8901"));
     * 
     * // 여러개의 핀번호 충전
     * await client.charge([
     *     new Pin("3110-0123-4567-8901"),
     *     new Pin("3110-0123-4567-8901")
     * ]);
     * @returns 충전 결과
     */
    public async charge(pin: Pin): Promise<CulturelandCharge>
    public async charge(pins: Pin[]): Promise<CulturelandCharge[]>
    public async charge(pins: Pin | Pin[]): Promise<CulturelandCharge | CulturelandCharge[]> {
        if (!(await this.isLogin())) throw new CulturelandError("LoginRequiredError", "로그인이 필요한 서비스 입니다.");

        if (!(pins instanceof Array)) pins = [pins];

        if (pins.length < 1 || pins.length > 10) throw new CulturelandError("RangeError", "핀번호는 1개 이상, 10개 이하여야 합니다.");

        const onlyMobileVouchers = pins.every(res => res.parts![3].length === 4); // 모바일문화상품권만 있는지

        // 선행 페이지 요청을 보내지 않으면 잘못된 접근 오류 발생
        const chargePageRequest = await this.client.get(
            onlyMobileVouchers ?
                "https://m.cultureland.co.kr/csh/cshGiftCard.do" : // 모바일문화상품권
                "https://m.cultureland.co.kr/csh/cshGiftCardOnline.do" // 문화상품권(18자리)
        ); // 문화상품권(18자리)에서 모바일문화상품권도 충전 가능, 모바일문화상품권에서 문화상품권(18자리) 충전 불가능

        const transKey = new mTransKey(this.cookieJar);
        const servletData = await transKey.getServletData();

        const scratches: Record<string, string> = {}; // scratch (핀번호)
        const fourthScratches: Record<string, string> = {}; // 네번째 핀 번호 암호화 정보

        await Promise.all(Array.from({ length: 10 }, (_, index) => index).map(async i => {
            const parts = pins[i]?.parts || ["", "", "", ""];
            const pinCount = i + 1; // scr0x이 아닌 scr1x부터 시작하기 때문에 1부터 시작

            const scr4 = `scr${pinCount}4`;
            const txtScr4 = `txtScr${pinCount}4`;

            // <input type="password" name="{scr4}" id="{txtScr4}">
            const keypad = transKey.createKeypad(servletData, "number", txtScr4, scr4);
            const keypadLayout = await keypad.getKeypadLayout();
            const encryptedPin = keypad.encryptPassword(parts[3], keypadLayout);

            // scratch
            scratches[`scr${pinCount}1`] = parts[0];
            scratches[`scr${pinCount}2`] = parts[1];
            scratches[`scr${pinCount}3`] = parts[2];
            scratches[scr4] = "*".repeat(parts[3].length);

            // keyboard
            fourthScratches["keyIndex_" + txtScr4] = keypad.keyIndex;
            fourthScratches["keyboardType_" + txtScr4] = keypad.keyboardType + "Mobile";
            fourthScratches["fieldType_" + txtScr4] = keypad.fieldType;

            // transkey
            fourthScratches["transkey_" + txtScr4] = encryptedPin.encrypted;
            fourthScratches["transkey_HM_" + txtScr4] = encryptedPin.encryptedHmac;
        }));

        let payload: Record<string, string> = {
            versionCode: "",
            ...scratches,
            seedKey: transKey.encryptedSessionKey,
            initTime: servletData.initTime,
            transkeyUuid: transKey.transkeyUuid,
            ...fourthScratches
        };

        const chargeRequest = await this.client.post(
            onlyMobileVouchers ?
                "https://m.cultureland.co.kr/csh/cshGiftCardProcess.do" : // 모바일문화상품권
                "https://m.cultureland.co.kr/csh/cshGiftCardOnlineProcess.do", // 문화상품권(18자리)
            new URLSearchParams(payload),
            {
                maxRedirects: 0,
                validateStatus: status => status === 302
            }
        );

        const chargeResultRequest = await this.client.get("https://m.cultureland.co.kr" + chargeRequest.headers.location);

        const chargeResult: string = chargeResultRequest.data; // 충전 결과 받아오기

        const parsedResults = parse(chargeResult) // 충전 결과 HTML 파싱
            .getElementsByTagName("tbody")[0]
            .getElementsByTagName("tr");

        const results: CulturelandCharge[] = [];

        for (let i = 0; i < pins.length; i++) {
            const chargeResult = parsedResults[i].getElementsByTagName("td");

            results.push({
                message: chargeResult[2].innerText as CulturelandCharge["message"],
                amount: parseInt(chargeResult[3].innerText.replace(/,/g, "").replace("원", ""))
            });
        }

        return results;
    }

    /**
     * 컬쳐캐쉬를 사용해 컬쳐랜드상품권(모바일문화상품권)을 본인 번호로 선물합니다.
     * @param amount 구매 금액 (최소 1천원부터 최대 5만원까지 100원 단위로 입력 가능)
     * @param quantity 구매 수량 (최대 5개)
     * @example
     * // 5000원권 1장을 나에게 선물
     * await client.gift(5000, 1);
     * @returns 선물 결과
     */
    public async gift(amount: number, quantity = 1): Promise<CulturelandGift> {
        if (!(await this.isLogin())) throw new CulturelandError("LoginRequiredError", "로그인이 필요한 서비스 입니다.");

        // 구매 금액이 조건에 맞지 않을 때
        if (amount % 100 !== 0 || amount < 1000 || amount > 50000) throw new CulturelandError("RangeError", "구매 금액은 최소 1천원부터 최대 5만원까지 100원 단위로 입력 가능합니다.");

        // 구매 수량이 조건에 맞지 않을 때
        if (quantity % 1 !== 0 || quantity < 1 || quantity > 5) throw new CulturelandError("RangeError", "구매 수량은 최소 1개부터 최대 5개까지 정수로 입력 가능합니다.");

        // 유저정보 가져오기 (선물구매에 userKey 필요)
        const userInfo = await this.getUserInfo();

        // 선행 페이지 요청을 보내지 않으면 잘못된 접근 오류 발생
        const giftPageRequest = await this.client.get("https://m.cultureland.co.kr/gft/gftPhoneApp.do");

        // 내폰으로 전송 (본인 번호 가져옴)
        const phoneInfoRequest = await this.client.post("https://m.cultureland.co.kr/cpn/getGoogleRecvInfo.json", new URLSearchParams({
            sendType: "LMS",
            recvType: "M",
            cpnType: "GIFT"
        }), {
            headers: {
                "Referer": "https://m.cultureland.co.kr/gft/gftPhoneApp.do"
            }
        });

        const phoneInfo: PhoneInfoResponse = phoneInfoRequest.data;
        if (phoneInfo.errMsg !== "정상") {
            if (phoneInfo.errMsg) throw new CulturelandError("LookupError", phoneInfo.errMsg);
            else throw new CulturelandError("ResponseError", "잘못된 응답이 반환되었습니다.");
        }

        const sendGiftRequest = await this.client.post("https://m.cultureland.co.kr/gft/gftPhoneCashProc.do", new URLSearchParams({
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

        const giftResultRequest = await this.client.get("https://m.cultureland.co.kr" + sendGiftRequest.headers.location);

        const giftResult: string = giftResultRequest.data; // 선물 결과 받아오기

        // 컬쳐랜드상품권(모바일문화상품권) 선물(구매)가 완료되었습니다.
        if (giftResult.includes("<strong> 컬쳐랜드상품권(모바일문화상품권) 선물(구매)가<br />완료되었습니다.</strong>")) {
            // 바코드의 코드 (URL 쿼리: code)
            const barcodeCode = giftResult.match(/<input type="hidden" id="barcodeImage"      name="barcodeImage"       value="https:\/\/m\.cultureland\.co\.kr\/csh\/mb\.do\?code=([\w/+=]+)" \/>/)?.[1];
            if (!barcodeCode) throw new CulturelandError("ResponseError", "선물 결과에서 바코드 URL을 찾을 수 없습니다.");

            // 핀번호(바코드 번호)를 가져오기 위해 바코드 정보 요청
            const barcodePath = "/csh/mb.do?code=" + barcodeCode;
            const barcodeDataRequest = await this.client.get("https://m.cultureland.co.kr" + barcodePath);

            const barcodeData: string = barcodeDataRequest.data;

            // 선물 결과에서 핀번호(바코드 번호) 파싱
            const pinCode: string = barcodeData
                .split("<span>바코드번호</span>")[1]
                .split("</span>")[0]
                .split("<span>")[1];

            return {
                pin: new Pin(pinCode),
                url: "https://m.cultureland.co.kr" + barcodePath
            };
        }

        // 컬쳐랜드상품권(모바일문화상품권) 선물(구매)가 실패 하였습니다.
        const failReason = giftResult.match(/<dt class="two">실패 사유 <span class="right">(.*)<\/span><\/dt>/)?.[1]?.replace(/<br>/g, " ");
        if (failReason) throw new CulturelandError("PurchaseError", failReason);
        else throw new CulturelandError("ResponseError", "잘못된 응답이 반환되었습니다.");
    }

    /**
     * 선물하기 API에서 선물 한도를 가져옵니다.
     * @example
     * await client.getGiftLimit();
     * @returns 선물 한도
     */
    public async getGiftLimit(): Promise<CulturelandGiftLimit> {
        if (!(await this.isLogin())) throw new CulturelandError("LoginRequiredError", "로그인이 필요한 서비스 입니다.");

        const limitInfoRequest = await this.client.post("https://m.cultureland.co.kr/gft/chkGiftLimitAmt.json");

        const limitInfo: GiftLimitResponse = limitInfoRequest.data;
        if (limitInfo.errMsg !== "정상") {
            if (limitInfo.errMsg) throw new CulturelandError("LookupError", limitInfo.errMsg);
            else throw new CulturelandError("ResponseError", "잘못된 응답이 반환되었습니다.");
        }

        return {
            remain: limitInfo.giftVO.ccashRemainAmt,
            limit: limitInfo.giftVO.ccashLimitAmt
        };
    }

    /**
     * 컬쳐캐쉬를 쿠팡캐시로 전환합니다.
     * 휴대폰본인인증회원만 이용 가능합니다.
     * 고객 부담 전환 수수료 6% 차감됩니다. (전환 비율 1:0.94)
     * 일 최대 10회 전환 가능합니다.
     * @param amount 전환 금액 (최소 1천원부터 월 최대 10만원까지 100원 단위로 입력 가능)
     * @example
     * // 컬쳐캐쉬 10000원 차감 & 쿠팡캐시 9400원 충전
     * const coupangCash = await client.changeCoupangCash(10000);
     * coupangCash.amount === 9400; // true
     * @returns 쿠팡캐시 전환 결과
     */
    public async changeCoupangCash(amount: number): Promise<CulturelandChangeCoupangCash> {
        if (!(await this.isLogin())) throw new CulturelandError("LoginRequiredError", "로그인이 필요한 서비스 입니다.");

        // 전환 금액이 조건에 맞지 않을 때
        if (amount % 100 !== 0 || amount < 1000 || amount > 100_000) throw new CulturelandError("RangeError", "전환 금액은 최소 1천원부터 월 최대 10만원까지 100원 단위로 입력 가능합니다.");

        // 선행 페이지에서 파라미터 가져옴
        const changeCoupangPageRequest = await this.client.get("https://m.cultureland.co.kr/chg/chgCoupangChange.do");

        const changeCoupangPage: string = changeCoupangPageRequest.data;

        // 컬쳐캐쉬 캐시백 파라미터
        const eventCode = changeCoupangPage.match(/<input type="hidden" name="eventCode" id="eventCode" value="([^"]*)">/)?.[1] || "";
        const freeFeeRate = parseFloat(changeCoupangPage.match(/<input type="hidden" name="freeFeeRate" id="freeFeeRate" value="([\d.]+)">/)?.[1] || "0");
        const fee = parseFloat(changeCoupangPage.match(/<input type="hidden" name="fee" id="fee" value="([\d.]+)">/)?.[1] || "0.06");

        // 잔여 쿠팡캐시 전환한도
        const possibleAmount = changeCoupangPage.match(/<input type="hidden" name="PossibleAmount" id="PossibleAmount" value="(\d+)">/)?.[1] || "106300";
        if (parseInt(possibleAmount) === 0) throw new CulturelandError("RangeError", "당월 전환 가능 금액을 모두 소진하셨습니다.");

        const changeCoupangCashRequest = await this.client.post("https://m.cultureland.co.kr/chg/chgCoupangChangeProc.json", new URLSearchParams({
            changeAmount: (amount * (1 - fee)).toString(),
            amount: amount.toString(),
            feeAmount: (amount * fee).toString(),
            freefeeAmount: (amount * freeFeeRate).toString(),
            eventCode,
            PossibleAmount: possibleAmount
        }), {
            headers: {
                "Referer": "https://m.cultureland.co.kr/chg/chgCoupangChange.do"
            }
        });

        const changeCoupangCash: ChangeCoupangCashResponse = changeCoupangCashRequest.data;
        if (changeCoupangCash.resultCd !== "0000") {
            if (changeCoupangCash.resultMsg) throw new CulturelandError("PurchaseError", changeCoupangCash.resultMsg);
            else throw new CulturelandError("ResponseError", "잘못된 응답이 반환되었습니다.");
        }

        return {
            amount: amount * (1 - fee)
        };
    }

    /**
     * 컬쳐캐쉬를 스마일캐시로 전환합니다.
     * 휴대폰본인인증회원만 이용 가능합니다.
     * 고객 부담 전환 수수료 5% 과금됩니다. (전환 비율 1.05:1)
     * @param amount 전환 금액 (최소 1천원부터 월 최대 200만원까지 100원 단위로 입력 가능)
     * @example
     * // 컬쳐캐쉬 10500원 차감 & 스마일캐시 10000원 충전
     * const smileCash = await client.changeSmileCash(10000);
     * smileCash.amount === 10500; // true
     * @returns 스마일캐시 전환 결과
     */
    public async changeSmileCash(amount: number): Promise<CulturelandChangeSmileCash> {
        if (!(await this.isLogin())) throw new CulturelandError("LoginRequiredError", "로그인이 필요한 서비스 입니다.");

        // 전환 금액이 조건에 맞지 않을 때
        if (amount % 100 !== 0 || amount < 1000 || amount > 2_000_000) throw new CulturelandError("RangeError", "전환 금액은 최소 1천원부터 월 최대 200만원까지 100원 단위로 입력 가능합니다.");

        // 선행 페이지에서 파라미터 가져옴
        const changeSmileCashPageRequest = await this.client.get("https://m.cultureland.co.kr/chg/chgSmileCashChange.do");

        const changeSmileCashPage: string = changeSmileCashPageRequest.data;

        // 컬쳐캐쉬 캐시백 파라미터
        const eventCode = changeSmileCashPage.match(/<input type="hidden" name="eventCode" id="eventCode" value="([^"]*)">/)?.[1] || "";
        const freeFeeRate = parseFloat(changeSmileCashPage.match(/<input type="hidden" name="freeFeeRate" id="freeFeeRate" value="([\d.]+)">/)?.[1] || "0");
        const fee = 0.05;

        // 잔여 스마일캐시 전환한도
        const possibleAmount = changeSmileCashPage.match(/<input type="hidden" name="PossibleAmount" id="PossibleAmount" value="(\d+)">/)?.[1] || "106300";
        if (parseInt(possibleAmount) === 0) throw new CulturelandError("RangeError", "당월 전환 가능 금액을 모두 소진하셨습니다.");

        const changeSmileCashRequest = await this.client.post("https://m.cultureland.co.kr/chg/chgSmileCashChangeProc.json", new URLSearchParams({
            changeAmount: amount.toString(),
            amount: (amount * (1 + fee)).toString(),
            feeAmount: (amount * fee).toString(),
            freefeeAmount: (amount * freeFeeRate).toString(),
            eventCode
        }), {
            headers: {
                "Referer": "https://m.cultureland.co.kr/chg/chgSmileCashChange.do"
            }
        });

        const changeSmileCash: ChangeSmileCashResponse = changeSmileCashRequest.data;
        if (changeSmileCash.resultCd !== "0000") {
            if (changeSmileCash.resultMsg) throw new CulturelandError("PurchaseError", changeSmileCash.resultMsg);
            else throw new CulturelandError("ResponseError", "잘못된 응답이 반환되었습니다.");
        }

        return {
            amount: amount * (1 + fee)
        };
    }

    /**
     * 컬쳐캐쉬를 사용해 Google Play 기프트 코드를 본인 번호로 구매합니다.
     * 안심금고가 활성화되어 있어야 합니다.
     * 구매 금액의 3% 수수료가 발생됩니다. (전환 비율 1.03:1)
     * @param amount 구매 금액 (5천원, 1만원, 1만5천원, 3만원, 5만원, 10만원, 15만원, 20만원)
     * @param quantity 구매 수량 (최대 10개)
     * @example
     * // 10000원권 1장을 구매하여 나에게 전송, 컬쳐캐쉬 10300원 차감
     * await client.giftGooglePlay(10000, 1);
     * @returns 전환 결과
     */
    public async giftGooglePlay(amount: number, quantity = 1): Promise<CulturelandGooglePlay[]> {
        if (!(await this.isLogin())) throw new CulturelandError("LoginRequiredError", "로그인이 필요한 서비스 입니다.");

        // 구매 금액이 조건에 맞지 않을 때
        if (![5_000, 10_000, 15_000, 30_000, 50_000, 100_000, 150_000, 200_000].includes(amount)) throw new CulturelandError("RangeError", "구매 금액은 5천원, 1만원, 1만5천원, 3만원, 5만원, 10만원, 15만원, 20만원만 입력 가능합니다.");

        // 구매 수량이 조건에 맞지 않을 때
        if (quantity % 1 !== 0 || quantity < 1 || quantity > 10) throw new CulturelandError("RangeError", "구매 수량은 최소 1개부터 최대 10개까지 정수로 입력 가능합니다.");

        // 유저정보 가져오기 (기프트 코드 구매에 userKey 필요)
        const userInfo = await this.getUserInfo();

        // 선행 페이지에서 파라미터 가져옴
        const googlePageRequest = await this.client.get("https://m.cultureland.co.kr/cpn/googleApp.do");

        const googlePage: string = googlePageRequest.data;

        // 컬쳐랜드 파라미터
        const tfsSeq = googlePage.match(/<input type="hidden" id="hidTFSSeq" name="tfsSeq" value="(\d+)" \/>/)?.[1] ?? "";
        const clientType = googlePage.match(/<input type="hidden" name="clientType"			id="clientType"			value="(\w*)"\/>/)?.[1] ?? "MWEB";
        const fee = parseInt(googlePage.match(/<input type="hidden" name="fee"					id="fee"				value="([\d.]*)">/)?.[1] ?? "0.03");
        const freeFeeYn = googlePage.match(/<input type="hidden" name="freeFeeYn"			id="freeFeeYn"			value="(\w*)">/)?.[1] ?? "";
        const freefeeReaminAmt = googlePage.match(/<input type="hidden" name="freefeeReaminAmt"	id="freefeeReaminAmt"	value="([\d,.]*)">/)?.[1] ?? ""; // freeFeeRemainAmount
        const freeFeeRate = googlePage.match(/<input type="hidden" name="freeFeeRate"			id="freeFeeRate"		value="([\d.]*)">/)?.[1] ?? "";
        const freeFeeEvUseYN = googlePage.match(/<input type="hidden" name="freeFeeEvUseYN"		id="freeFeeEvUseYN"		value="(\w*)">/)?.[1] ?? "";
        const eventCode = googlePage.match(/<input type="hidden" name="eventCode"			id="eventCode"			value="([^"]*)">/)?.[1] ?? "";
        const cpnType = googlePage.match(/<input type="hidden" id="cpnType" name="cpnType" value="(\w*)"\/>/)?.[1] ?? "G";

        // 페이투스 파라미터
        const MallIP = googlePage.match(/<input type="hidden" name="MallIP" value="([\d.]*)"\/>/)?.[1] ?? "211.215.20.243";
        const UserIP = googlePage.match(/<input type="hidden" name="UserIP" value="([\d.]*)">/)?.[1] ?? "";
        const ediDate = googlePage.match(/<input type="hidden" name="ediDate" id="ediDate" value="(\d*)">/)?.[1] ?? "20240410165953";
        const EncryptData = googlePage.match(/<input type="hidden" name="EncryptData" value="([^"]*)">/)?.[1] ?? "";
        const MallReserved = googlePage.match(/<input type="hidden" name="MallReserved"  value="([^"]*)"\/>/)?.[1] ?? "";
        const PayMethod = googlePage.match(/<input type="hidden" name="PayMethod" value="(\w*)">/)?.[1] ?? "CARD";
        const GoodsName = googlePage.match(/<input type="hidden" name="GoodsName" id="GoodsName" value="([^"]*)"\/>/)?.[1] ?? "Google Play 기프트 코드";
        const EncodingType = googlePage.match(/<input type="hidden" name="EncodingType" id="EncodingType" value="(\w*)">/)?.[1] ?? "utf8";
        const TransType = googlePage.match(/<input type="hidden" name="TransType" value="(\d*)">/)?.[1] ?? "0";
        const MID = googlePage.match(/<input type="hidden" name="MID" id="MID" value="(\d*)">/)?.[1] ?? "9010042942";
        const SUB_ID = googlePage.match(/<input type="hidden" name="SUB_ID" (id="SUB_ID" )?value="(\d*)">/)?.[1] ?? "";
        const ReturnURL = googlePage.match(/<input type="hidden" name="ReturnURL" value="([^"]*)">/)?.[1] ?? "https://m.cultureland.co.kr/cpn/paytusReturnUrl.do";
        const RetryURL = googlePage.match(/<input type="hidden" name="RetryURL" value="([^"]*)">/)?.[1] ?? "";
        const mallUserID = googlePage.match(/<input type="hidden" name="mallUserID" value="([^"]*)">/)?.[1] ?? userInfo.userKey!;
        const BuyerName = googlePage.match(/<input type="hidden" name="BuyerName" value="([^"]*)">/)?.[1] ?? "";
        const Moid = googlePage.match(/<input type="hidden" name="Moid" value="(\w*)">/)?.[1] ?? "";
        const popupUrl = googlePage.match(/<input type="hidden" name=popupUrl id="popupUrl" value="([^"]*)">/)?.[1] ?? "https://pg.paytus.co.kr/pay/interfaceURL.jsp";
        const BuyerEmail = googlePage.match(/<input type="hidden" name="BuyerEmail" id="BuyerEmail" value="([^"]*)">/)?.[1] ?? "";
        const BuyerAddr = googlePage.match(/<input type="hidden" name="BuyerAddr" id="BuyerAddr" value="([^"]*)">/)?.[1] ?? "";
        const merchantKey = googlePage.match(/<input type="hidden" name=merchantKey id="merchantKey" value="(\w*)">/)?.[1] ?? "e0e18e2094773e64e64fa09895fd83b4c3b1a381cb6ef72a296f7b5cd8d6c868";
        const email = googlePage.match(/<input type="hidden" name=email id="email" value="([^"]*)" \/>/)?.[1] ?? "nomail";
        const Email1 = googlePage.match(/<input type="hidden" name=Email1 id="Email1" value="(\w*)" \/>/)?.[1] ?? "";
        const Email2 = googlePage.match(/<input type="hidden" name=Email2 id="Email2" value="(\w*)" \/>/)?.[1] ?? "";
        const discount = googlePage.match(/<input type="hidden" name=discount id="discount" value="([\d.]*)">/)?.[1] ?? "0.0";

        // 다날페이 파라미터
        const cardcode = googlePage.match(/<input type="hidden" name="cardcode" id="cardcode" value="([^"]*)">/)?.[1] ?? "";
        const Md5MallReserved = googlePage.match(/<input type="hidden" name="Md5MallReserved" id="Md5MallReserved"  value="([^"]*)"\/>/)?.[1] ?? "";
        const orderid = googlePage.match(/<input type="hidden" name="orderid" id="orderid" value="(\w*)">/)?.[1] ?? "";
        const itemname = googlePage.match(/<input type="hidden" name="itemname" id="itemname" value="([^"]*)">/)?.[1] ?? "Google Play 기프트 코드";
        const useragent = googlePage.match(/<input type="hidden" name="useragent" id="useragent" value="([^"]*)">/)?.[1] ?? "WM";

        // 내폰으로 전송 (본인 번호 가져옴)
        const phoneInfoRequest = await this.client.post("https://m.cultureland.co.kr/cpn/getGoogleRecvInfo.json", new URLSearchParams({
            sendType: "LMS",
            recvType: "M",
            cpnType: "GOOGLE"
        }), {
            headers: {
                "Referer": "https://m.cultureland.co.kr/cpn/googleApp.do"
            }
        });

        const phoneInfo: PhoneInfoResponse = phoneInfoRequest.data;
        if (phoneInfo.errMsg !== "정상") {
            if (phoneInfo.errMsg) throw new CulturelandError("LookupError", phoneInfo.errMsg);
            else throw new CulturelandError("ResponseError", "잘못된 응답이 반환되었습니다.");
        }

        // 기프트 코드 구매 전 구매 내역
        const oldGoogleHistoryRequest = await this.client.post("https://m.cultureland.co.kr/cpn/googleBuyHisItem.json", new URLSearchParams({
            addDay: "0",
            searchYear: "",
            searchMonth: "",
            pageSize: "20",
            cancelType: "",
            page: "1",
            tabFlag: "cash",
            inputHp: ""
        }), {
            headers: {
                "Referer": "https://m.cultureland.co.kr/cpn/googleBuyHis.do"
            }
        });

        const oldGoogleHistory: GooglePlayHistoryResponse = oldGoogleHistoryRequest.data;

        const payload = new URLSearchParams({
            tfsSeq: tfsSeq,
            clientType: clientType,
            fee: fee.toString(),
            feeAmount: (amount * fee).toString(),
            freefeeAmount: (amount * (parseFloat(freeFeeRate ?? "0") || 0)).toString(),
            freeFeeYn: freeFeeYn,
            freefeeReaminAmt: freefeeReaminAmt,
            freeFeeRate: freeFeeRate,
            freeFeeEvUseYN: freeFeeEvUseYN,
            eventCode: eventCode,
            cpnType: cpnType,
            MallIP: MallIP,
            UserIP: UserIP,
            ediDate: ediDate,
            EncryptData: EncryptData,
            MallReserved: decodeURIComponent(MallReserved),
            PayMethod: PayMethod,
            GoodsName: decodeURIComponent(GoodsName),
            Amt: (amount * (1 + fee)).toString(),
            EncodingType: EncodingType,
            TransType: TransType,
            MID: MID,
            SUB_ID: SUB_ID,
            ReturnURL: decodeURIComponent(ReturnURL),
            RetryURL: decodeURIComponent(RetryURL),
            mallUserID: mallUserID,
            BuyerName: decodeURIComponent(BuyerName),
            Moid: Moid,
            popupUrl: decodeURIComponent(popupUrl),
            BuyerTel: userInfo.phone!,
            BuyerEmail: decodeURIComponent(BuyerEmail),
            BuyerAddr: BuyerAddr,
            merchantKey: merchantKey,
            Email1: Email1,
            Email2: Email2,
            discount: discount,
            cardcode: cardcode,
            Md5MallReserved: decodeURIComponent(Md5MallReserved),
            orderid: orderid,
            itemname: decodeURIComponent(itemname),
            useragent: useragent,
            sendType: "LMS",
            amount: amount.toString(),
            rdSendType: "rdlms",
            chkLms: "M",
            recvHP: userInfo.phone!,
            buyType: "CASH",
            chkAgree_paytus: "on"
        });
        payload.append("quantity", quantity.toString());
        payload.append("quantity", quantity.toString());
        payload.append("email", email);
        payload.append("email", "");

        const sendGoogleRequest = await this.client.post("https://m.cultureland.co.kr/cpn/googleBuyProc.json", payload, {
            headers: {
                "Referer": "https://m.cultureland.co.kr/cpn/googleApp.do"
            }
        });

        const sendGoogle: GooglePlayBuyResponse = sendGoogleRequest.data;

        if (sendGoogle.errCd !== "0" || sendGoogle.errMsg !== "정상") {
            if (sendGoogle.errCd == "1001") throw new CulturelandError("SafeLockRequiredError", "안심금고 서비스 가입 후 Google Play 기프트 코드 구매가 가능합니다.");
            else if (sendGoogle.errCd == "1108") throw new CulturelandError("ItemUnavailableError", "현재 선택하신 상품은 일시 품절입니다. 다른 권종의 상품으로 구매해 주세요.");
            else if (sendGoogle.errCd == "-998") throw new CulturelandError("PurchaseRestrictedError", "전용계좌, 계좌이체, 무통장입금으로 컬쳐캐쉬를 충전하신 경우 안전한 서비스 이용을 위해 구매 및 선물 서비스가 제한됩니다. 자세한 문의사항은 고객센터(1577-2111)로 문의주시기 바랍니다.");
            else if (sendGoogle.pinBuyYn == "Y") throw new CulturelandError("DeliverFailError", "발송에 실패 하였습니다. 구매내역에서 재발송 해주세요!");
            else if (sendGoogle.pinBuyYn == "N") throw new CulturelandError("PurchaseError", `구매에 실패 하였습니다. (실패 사유 : ${sendGoogle.errMsg}) 다시 구매해 주세요!`);
            else if (sendGoogle.errMsg) throw new CulturelandError("PurchaseError", sendGoogle.errMsg.replace(/<br>/g, " "));
            else throw new CulturelandError("ResponseError", "잘못된 응답이 반환되었습니다.");
        }

        // 기프트 코드 구매 후 구매 내역
        let googleHistoryRequest = await this.client.post("https://m.cultureland.co.kr/cpn/googleBuyHisItem.json", new URLSearchParams({
            addDay: "0",
            searchYear: "",
            searchMonth: "",
            pageSize: "20",
            cancelType: "",
            page: "1",
            tabFlag: "cash",
            inputHp: ""
        }), {
            headers: {
                "Referer": "https://m.cultureland.co.kr/cpn/googleBuyHis.do"
            }
        });

        let googleHistory: GooglePlayHistoryResponse = googleHistoryRequest.data;

        // 기프트 코드 구매 내역의 수가 변할 때까지 최대 10회 반복
        for (let i = 0; i < 10; i++) {
            if (googleHistory.cpnVO.totalCnt !== oldGoogleHistory.cpnVO.totalCnt) break;

            await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 대기

            googleHistoryRequest = await this.client.post("https://m.cultureland.co.kr/cpn/googleBuyHisItem.json", new URLSearchParams({
                addDay: "0",
                searchYear: "",
                searchMonth: "",
                pageSize: "20",
                cancelType: "",
                page: "1",
                tabFlag: "cash",
                inputHp: ""
            }), {
                headers: {
                    "Referer": "https://m.cultureland.co.kr/cpn/googleBuyHis.do"
                }
            });

            googleHistory = googleHistoryRequest.data;
        }

        // 기프트 코드 구매 내역의 수가 구매한 기프트 코드의 수만큼 변하지 않음
        if (googleHistory.cpnVO.totalCnt !== oldGoogleHistory.cpnVO.totalCnt + quantity) throw new CulturelandError("LookupError", "구매한 기프트 코드의 정보를 가져올 수 없습니다. 본인 번호로 발송된 코드를 확인해 주세요.");

        // 구매 전 기프트 코드 내역과 대조
        const googleGifts = googleHistory.list.filter(
            history =>
                parseInt(history.item.Amount) === amount &&
                parseInt(history.item.FaceValue) === amount &&
                history.item.ReceiveInfo === userInfo.phone &&
                !oldGoogleHistory.list.find(_history => _history.item.ScrachNo === history.item.ScrachNo)
        );

        // 새로운 기프트 코드 구매 내역의 수가 구매한 기프트 코드의 수와 일치하지 않음
        if (googleGifts.length !== quantity) throw new CulturelandError("LookupError", "구매한 기프트 코드의 정보를 가져올 수 없습니다. 본인 번호로 발송된 코드를 확인해 주세요.");

        const results: CulturelandGooglePlay[] = [];

        for (const googleGift of googleGifts) {
            results.push({
                pin: googleGift.item.ScrachNo,
                url: "https://play.google.com/redeem?code=" + googleGift.item.ScrachNo,
                certNo: googleGift.item.PurchaseCertNo
            });
        }

        return results;
    }

    /**
     * 안심금고 API에서 유저 정보를 가져옵니다.
     * @example
     * await client.getUserInfo();
     * @returns 유저 정보
     */
    public async getUserInfo(): Promise<CulturelandUser> {
        if (!(await this.isLogin())) throw new CulturelandError("LoginRequiredError", "로그인이 필요한 서비스 입니다.");

        const userInfoRequest = await this.client.post("https://m.cultureland.co.kr/tgl/flagSecCash.json");

        const userInfo: UserInfoResponse = userInfoRequest.data;
        if (userInfo.resultMessage !== "성공") {
            if (userInfo.resultMessage) throw new CulturelandError("LookupError", userInfo.resultMessage);
            else throw new CulturelandError("ResponseError", "잘못된 응답이 반환되었습니다.");
        }

        return {
            phone: userInfo.Phone,
            safeLevel: parseInt(userInfo.SafeLevel),
            safePassword: userInfo.CashPwd !== "0",
            registerDate: Date.parse(userInfo.RegDate),
            userId: userInfo.userId,
            userKey: userInfo.userKey,
            userIp: userInfo.userIp,
            index: parseInt(userInfo.idx),
            category: userInfo.category
        };
    }

    /**
     * 내정보 페이지에서 멤버 정보를 가져옵니다.
     * @example
     * await client.getMemberInfo();
     * @returns 멤버 정보
     */
    public async getMemberInfo(): Promise<CulturelandMember> {
        if (!(await this.isLogin())) throw new CulturelandError("LoginRequiredError", "로그인이 필요한 서비스 입니다.");

        const memberInfoRequest = await this.client.post("https://m.cultureland.co.kr/mmb/mmbMain.do");

        const memberInfo: string = memberInfoRequest.data;

        if (!memberInfo.includes("meTop_info")) throw new CulturelandError("LookupError", "멤버 정보를 가져올 수 없습니다.");

        const memberData = parse(memberInfo) // 멤버 정보 HTML 파싱
            .getElementById("meTop_info")!;

        return {
            id: memberData.getElementsByTagName("span")[0].innerText,
            name: memberData.getElementsByTagName("strong")[0].innerText.trim(),
            verificationLevel: memberData.getElementsByTagName("p")[0].innerText as CulturelandMember["verificationLevel"]
        };
    }

    /**
     * 컬쳐캐쉬 충전 / 사용 내역을 가져옵니다.
     * @param days 조회 일수
     * @param pageSize 한 페이지에 담길 내역 수 (default: 20)
     * @param page 페이지 (default: 1)
     * @example
     * // 최근 30일간의 내역 중 1페이지의 내역
     * await client.getCultureCashLogs(30, 20, 1);
     * @returns 컬쳐 캐시 사용 내역
     */
    public async getCultureCashLogs(days: number, pageSize = 20, page = 1): Promise<CulturelandCashLog[]> {
        if (!(await this.isLogin())) throw new CulturelandError("LoginRequiredError", "로그인이 필요한 서비스 입니다.");

        const cashLogsRequest = await this.client.post("https://m.cultureland.co.kr/tgl/cashList.json", new URLSearchParams({
            addDay: (days - 1).toString(),
            pageSize: pageSize.toString(),
            page: page.toString()
        }), {
            headers: {
                "Referer": "https://m.cultureland.co.kr/tgl/cashSearch.do"
            }
        });

        const cashLogs: CashLogsResponse = cashLogsRequest.data;

        return cashLogs.map(log => ({
            title: log.item.Note,
            merchantCode: log.item.memberCode,
            merchantName: log.item.memberName,
            amount: parseInt(log.item.inAmount) - parseInt(log.item.outAmount),
            balance: parseInt(log.item.balance),
            spendType: log.item.accType as CulturelandCashLog["spendType"],
            timestamp: Date.parse(log.item.accDate.replace(/(\d{4})(\d{2})(\d{2})/g, "$1-$2-$3") + " " + log.item.accTime.replace(/(\d{2})(\d{2})(\d{2})/g, "$1:$2:$3"))
        }));
    }

    /**
     * 현재 세션이 컬쳐랜드에 로그인되어 있는지 확인합니다.
     * @example
     * await client.isLogin();
     * @returns 로그인 여부
     */
    public async isLogin() {
        const isLoginRequest = await this.client.post("https://m.cultureland.co.kr/mmb/isLogin.json");
        const isLogin = isLoginRequest.data;
        return typeof isLogin === "boolean" ? isLogin : false;
    }

    /**
     * ID와 비밀번호 또는 로그인 유지 쿠키로 컬쳐랜드에 로그인합니다.
     */
    /**
     * 로그인 유지 쿠키를 사용하여 컬쳐랜드에 로그인합니다.
     * @param keepLoginConfig 로그인 유지 쿠키
     * @example
     * const keepLoginInfo = await cookieStore.get("KeepLoginConfig")
     *     .then(cookie => cookie.value);
     * await client.login(keepLoginInfo);
     * @returns 로그인 결과
    */
    public async login(keepLoginConfig: string): Promise<CulturelandLogin>
    /**
     * 아이디/비밀번호를 사용하여 컬쳐랜드에 로그인합니다.
     * @param id 컬쳐랜드 ID
     * @param password 컬쳐랜드 비밀번호
     * @example
     * await client.login("test1234", "test1234!");
     * @returns 로그인 결과
     */
    public async login(id: string, password: string): Promise<CulturelandLogin>
    public async login(arg0: string, arg1?: string): Promise<CulturelandLogin> {
        let id = "";
        let password = "";
        let keepLoginConfig = randomString(64);
        let loginMethod: "idpw" | "cookie";

        if (arg1) {
            loginMethod = "idpw";
            id = arg0;
            password = arg1;
        } else {
            loginMethod = "cookie";
            keepLoginConfig = arg0;
        }

        keepLoginConfig = decodeURIComponent(keepLoginConfig);

        await this.cookieJar.setCookie(
            new Cookie({ key: "KeepLoginConfig", value: encodeURIComponent(keepLoginConfig) }),
            "https://m.cultureland.co.kr"
        );

        if (loginMethod === "cookie") {
            const loginMainRequest = await this.client.get("https://m.cultureland.co.kr/mmb/loginMain.do", {
                headers: {
                    "Referer": "https://m.cultureland.co.kr/index.do"
                }
            });

            const loginMain: string = loginMainRequest.data;

            const userId = loginMain.match(/<input type="text" id="txtUserId" name="userId" value="(\w*)" maxlength="12" oninput="maxLengthCheck\(this\);" placeholder="아이디" >/)?.[1];

            if (!userId) throw new CulturelandError("LoginError", "입력하신 로그인 유지 정보는 만료된 정보입니다.");
            id = userId;
        }

        const browserId = crypto.randomBytes(16).toString("hex");

        const macAddressRequest = await this.client.post("https://m.cultureland.co.kr/mmb/macAddrSelect.json", new URLSearchParams({
            flag: "newMacAddr"
        }), {
            headers: {
                "Referer": "https://m.cultureland.co.kr/mmb/loginMain.do"
            }
        });

        const macAddress = macAddressRequest.data?.newMacAddr as string | undefined || crypto.randomBytes(15).toString("hex").toUpperCase();

        const transKey = new mTransKey(this.cookieJar);
        const servletData = await transKey.getServletData();

        const keypad = transKey.createKeypad(servletData, "qwerty", "passwd", "passwd");
        const keypadLayout = await keypad.getKeypadLayout();
        const encryptedPassword = keypad.encryptPassword(password, keypadLayout);

        const payload = new URLSearchParams({
            agentUrl: "",
            returnUrl: "",
            keepLoginInfo: loginMethod === "cookie" ? keepLoginConfig : "",
            phoneForiOS: "",
            hidWebType: "other",
            browserId,
            newMacAddr: macAddress,
            addUserId: "",
            // KeepLoginConfig 쿠키를 사용할 경우 hCaptcha 값의 유효 여부를 확인하지 않는 취약점 사용
            checkhCaptcha: "",
            userId: id,
            passwd: "*".repeat(password.length),
            keepLogin: "Y",
            seedKey: transKey.encryptedSessionKey,
            initTime: servletData.initTime,
            keyIndex_passwd: keypad.keyIndex,
            keyboardType_passwd: keypad.keyboardType + "Mobile",
            fieldType_passwd: keypad.fieldType,
            transkeyUuid: transKey.transkeyUuid,
            transkey_passwd: encryptedPassword.encrypted,
            transkey_HM_passwd: encryptedPassword.encryptedHmac
        });

        const loginRequest = await this.client.post("https://m.cultureland.co.kr/mmb/loginProcess.do", payload, {
            headers: {
                "Referer": "https://m.cultureland.co.kr/mmb/loginMain.do"
            },
            maxRedirects: 0,
            validateStatus: status => status === 200 || status === 302,
            proxy: this.proxy ?? false
        });

        // 메인 페이지로 리다이렉션되지 않은 경우
        if (loginRequest.status === 200) {
            const errorMessage = loginRequest.data.match(/<input type="hidden" name="loginErrMsg"  value="([^"]+)" \/>/)?.[1];
            if (errorMessage) throw new CulturelandError("LoginError", errorMessage);
            else throw new CulturelandError("ResponseError", "잘못된 응답이 반환되었습니다.");
        }

        // 컬쳐랜드 로그인 정책에 따라 로그인이 제한된 경우
        if (loginRequest.headers.location === "/cmp/authConfirm.do") {
            const errorPageRequest = await this.client.get("https://m.cultureland.co.kr" + loginRequest.headers.location);

            const errorPage: string = errorPageRequest.data;

            // 제한코드 가져오기
            const errorCode = errorPage.match(/var errCode = "(\d+)";/)?.[1];
            throw new CulturelandError("LoginRestrictedError", `컬쳐랜드 로그인 정책에 따라 로그인이 제한되었습니다.${errorCode ? ` (제한코드: ${errorCode})` : ""}`);
        }

        // 로그인 유지 정보 가져오기
        const KeepLoginConfigCookie = loginRequest.headers["set-cookie"]?.find(cookie => cookie.startsWith("KeepLoginConfig="));
        if (KeepLoginConfigCookie) {
            const KeepLoginConfig = KeepLoginConfigCookie.split("=")[1].split(";")[0];
            return {
                userId: id,
                keepLoginConfig: decodeURIComponent(KeepLoginConfig),
                browserId,
                macAddress: macAddress!
            };
        } else {
            return {
                userId: id,
                browserId,
                macAddress: macAddress!
            };
        }
    }
}

export default Cultureland;