﻿/* NodeJS 내장 모듈 import */
import crypto from "crypto";
/* NodeJS 내장 모듈 import */


/* NPM 모듈 import */
import axios, { AxiosInstance, AxiosError, AxiosProxyConfig } from "axios";
import { HttpCookieAgent, HttpsCookieAgent } from "http-cookie-agent/http";
import { parse } from "node-html-parser";
import { Cookie, CookieJar } from "tough-cookie";
/* NPM 모듈 import */


/* 파일 import */
import mTransKey from "./mTranskey/transkey.js";
import CapMonster from "./capmonster.js";
import Pin from "./pin.js";
import { KeyStringValueStringObject, VoucherResponse, VoucherResultOther, CulturelandVoucher, BalanceResponse, CulturelandBalance, PhoneInfoResponse, CulturelandCharge, CulturelandGift, GiftLimitResponse, CulturelandGiftLimit, ChangeCoupangCashResponse, CulturelandChangeCoupangCash, ChangeSmileCashResponse, CulturelandChangeSmileCash, CulturelandGooglePlay, GooglePlayBuyResponse, GooglePlayHistoryResponse, UserInfoResponse, CulturelandUser, CulturelandMember, CashLogsResponse, CulturelandCashLogs, CulturelandLogin, CulturelandLoginWithKeepLoginInfo } from "./types.js";
import CulturelandError from "./errors.js";
/* 파일 import */


/* 상수 선언 */
const version = "2.1.1";
/* 상수 선언 */


export default class Cultureland {
    cookieJar: CookieJar;
    client: AxiosInstance;
    proxy?: AxiosProxyConfig;

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
    constructor(proxy?: AxiosProxyConfig) {
        this.cookieJar = new CookieJar();
        this.client = axios.create({
            headers: {
                "User-Agent": `cultureland.js/${version} (+https://github.com/DollarNoob/cultureland.js)`
            },
            httpAgent: new HttpCookieAgent({ cookies: { jar: this.cookieJar } }),
            httpsAgent: new HttpsCookieAgent({ cookies: { jar: this.cookieJar } })
        });
        this.proxy = proxy; // 로그인 시에만 프록시 사용
        this.client.interceptors.response.use(res => res, err => err); // AxiosError 발생시 throw하는 대신 resolve하도록 변경 (더 나은 오류 핸들링)
    }

    /**
     * 컬쳐랜드상품권(모바일문화상품권, 16자리)의 정보를 가져옵니다.
     * 로그인이 필요합니다.
     * 계정당 일일 조회수 10회 한도가 있습니다.
     * @param pin 상품권의 핀번호
     * @example
     * await client.checkVoucher(new Pin("3110-0123-4567-8901"));
     * @returns `amount`: number - 상품권의 금액
     * @returns `balance`: number - 상품권의 잔액
     * @returns `certNo`: string - 상품권의 발행번호 (인증번호)
     * @returns `createdDate`: string - 상품권의 발행일 | `20241231`
     * @returns `expiryDate`: string - 상품권의 만료일 | `20291231`
     * @returns `spendHistory[].title`: string - 내역 제목
     * @returns `spendHistory[].merchantName`: string - 사용 가맹점 이름
     * @returns `spendHistory[].amount`: number - 사용 금액
     * @returns `spendHistory[].timestamp`: number - 내역 시간
     */
    async checkVoucher(pin: Pin): Promise<CulturelandVoucher | CulturelandError> {
        if (!(await this.isLogin())) throw new CulturelandError("LoginRequiredError", "로그인이 필요한 서비스 입니다.");

        // 핀번호가 유효하지 않거나 41로 시작하지 않거나 311~319로 시작하지 않는다면 리턴
        // /assets/js/egovframework/com/cland/was/util/ClandCmmUtl.js L1281
        if (pin.parts === null || !(pin.parts[0].startsWith("41") || /^31[1-9]/.test(pin.parts[0]))) {
            return new CulturelandError("InvalidPinError", "정확한 모바일 상품권 번호를 입력하세요.");
        }

        const transKey = new mTransKey(this.cookieJar);
        const servletData = await transKey.getServletData();

        // <input type="tel" title="네 번째 6자리 입력" id="input-14" name="culturelandInput">
        const keypad = transKey.createKeypad(servletData, "number", "input-14", "culturelandInput", "tel");
        const keypadLayout = await keypad.getKeypadLayout();
        const encryptedPin = keypad.encryptPassword(pin.parts[3], keypadLayout);

        // culturelandInput 실제로 같은 키 4개가 사용되어 그대로 반영하였습니다.
        const requestBody = new URLSearchParams({
            "culturelandNo": pin.parts[0] + pin.parts[1] + pin.parts[2],
            "seedKey": transKey.crypto.encSessionKey,
            "initTime": servletData.initTime,
            "keyIndex_input-14": keypad.keyIndex,
            "keyboardType_input-14": keypad.keyboardType + "Mobile",
            "fieldType_input-14": keypad.fieldType,
            "transkeyUuid": transKey.crypto.transkeyUuid,
            "transkey_input-14": encryptedPin,
            "transkey_HM_input-14": transKey.crypto.hmacDigest(encryptedPin)
        });

        const voucherDataRequest = await this.client.post("https://m.cultureland.co.kr/vchr/getVoucherCheckMobileUsed.json", requestBody.toString(), {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "Referer": "https://m.cultureland.co.kr/vchr/voucherUsageGiftM.do"
            }
        });
        if (voucherDataRequest instanceof AxiosError) {
            return new CulturelandError("AxiosError", "POST /vchr/getVoucherCheckMobileUsed.json 요청에 실패하였습니다.", voucherDataRequest);
        }

        const voucherData: VoucherResponse = voucherDataRequest.data;

        if (voucherData.resultCd === "0") {
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
        else if (voucherData.resultCd === "1") {
            return new CulturelandError("LookupError", "일일 조회수를 초과하셨습니다.");
        }

        if (voucherData.resultMsg) {
            console.log(voucherData.resultMsg);
            return new CulturelandError("LookupError", "");
        }

        return new CulturelandError("ResponseError", "잘못된 응답이 반환되었습니다.");
    }

    /**
     * 컬쳐랜드 계정의 컬쳐캐쉬 잔액을 가져옵니다.
     * @example
     * await client.getBalance();
     * @returns `balance`: number - 사용 가능 금액
     * @returns `safeBalance`: number - 보관중인 금액 (안심금고)
     * @returns `totalBalance`: number - 총 잔액 (사용 가능 금액 + 보관중인 금액)
     */
    async getBalance(): Promise<CulturelandBalance | CulturelandError> {
        if (!(await this.isLogin())) throw new CulturelandError("LoginRequiredError", "로그인이 필요한 서비스 입니다.");

        const balanceRequest = await this.client.post("https://m.cultureland.co.kr/tgl/getBalance.json");
        if (balanceRequest instanceof AxiosError) {
            return new CulturelandError("AxiosError", "POST /tgl/getBalance.json 요청에 실패하였습니다.", balanceRequest);
        }

        const balance: BalanceResponse = balanceRequest.data;
        if (balance.resultMessage !== "성공") {
            if (balance.resultMessage) {
                return new CulturelandError("LookupError", balance.resultMessage);
            }

            return new CulturelandError("ResponseError", "잘못된 응답이 반환되었습니다.");
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
     * @param pins 상품권(들)의 핀번호
     * @example
     * // 한 개의 핀번호 충전
     * await client.charge(new Pin("3110-0123-4567-8901"));
     * 
     * // 여러개의 핀번호 충전
     * await client.charge([
     *     new Pin("3110-0123-4567-8901"),
     *     new Pin("3110-0123-4567-8901")
     * ]);
     * @returns `message`: string - 성공 여부 메시지 | `충전 완료`, `상품권지갑 보관`, `잔액이 0원인 상품권`, `상품권 번호 불일치`
     * @returns `amount`: number - 충전 금액
     */
    async charge(pins: Pin | Pin[]): Promise<CulturelandCharge | CulturelandCharge[] | CulturelandError> {
        if (!(await this.isLogin())) throw new CulturelandError("LoginRequiredError", "로그인이 필요한 서비스 입니다.");

        if (pins instanceof Pin) { // 핀번호가 1개라면
            const pin = pins;

            // 핀번호가 유효하지 않는다면 리턴
            if (pin.parts === null) {
                return new CulturelandError("InvalidPinError", "핀번호가 유효하지 않습니다.");
            }

            // 선행 페이지 요청을 보내지 않으면 잘못된 접근 오류 발생
            const chargePageRequest = await this.client.get(
                pin.parts[3].length === 4 ?
                "https://m.cultureland.co.kr/csh/cshGiftCard.do" : // 모바일문화상품권
                "https://m.cultureland.co.kr/csh/cshGiftCardOnline.do" // 문화상품권(18자리)
            );
            if (chargePageRequest instanceof AxiosError) {
                return new CulturelandError("AxiosError", `GET ${
                    pin.parts[3].length === 4 ?
                        "/csh/cshGiftCard.do" :
                        "/csh/cshGiftCardOnline.do"
                } 요청에 실패하였습니다.`, chargePageRequest);
            }

            const transKey = new mTransKey(this.cookieJar);
            const servletData = await transKey.getServletData();

            // <input type="password" name="scr14" id="txtScr14">
            const keypad = transKey.createKeypad(servletData, "number", "txtScr14", "scr14");
            const keypadLayout = await keypad.getKeypadLayout();
            const encryptedPin = keypad.encryptPassword(pin.parts[3], keypadLayout);

            const requestBody = new URLSearchParams({
                versionCode: "",
                scr11: pin.parts[0],
                scr12: pin.parts[1],
                scr13: pin.parts[2],
                scr14: "*".repeat(pin.parts[3].length),
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
                pin.parts[3].length === 4 ?
                "https://m.cultureland.co.kr/csh/cshGiftCardProcess.do" : // 모바일문화상품권
                "https://m.cultureland.co.kr/csh/cshGiftCardOnlineProcess.do", // 문화상품권(18자리)
                requestBody.toString(),
                {
                    maxRedirects: 0,
                    validateStatus: status => status === 302
                }
            );
            if (chargeRequest instanceof AxiosError) {
                return new CulturelandError("AxiosError", `POST ${
                    pin.parts[3].length === 4 ?
                        "/csh/cshGiftCardProcess.do" :
                        "/csh/cshGiftCardOnlineProcess.do"
                } 요청에 실패하였습니다.`, chargeRequest);
            }

            const chargeResultRequest = await this.client.get("https://m.cultureland.co.kr" + chargeRequest.headers.location);
            if (chargeResultRequest instanceof AxiosError) {
                return new CulturelandError("AxiosError", `GET ${chargeRequest.headers.location} 요청에 실패하였습니다.`, chargeResultRequest);
            }

            const chargeResult: string = chargeResultRequest.data; // 충전 결과 받아오기

            const chargeData = parse(chargeResult) // 충전 결과 HTML 파싱
                .getElementsByTagName("tbody")[0]
                .getElementsByTagName("tr")[0]
                .getElementsByTagName("td");

            return {
                message: chargeData[2].innerText,
                amount: parseInt(chargeData[3].innerText.replace(/,/g, "").replace("원", ""))
            };
        }
        else { // 핀번호가 배열이라면
            if (pins.length > 10) { // 핀번호가 10개 이상이라면
                return new CulturelandError("RangeError", "핀번호는 1개 이상, 10개 이하여야 합니다.");
            }

            // 유효하지 않은 핀번호가 있다면
            const invalidIndex = pins.findIndex(pin => pin.parts === null);
            if (invalidIndex !== -1) {
                return new CulturelandError("InvalidPinError", (invalidIndex + 1) + "번째 핀번호가 유효하지 않습니다.");
            }

            const onlyMobileVouchers = pins.every(res => res.parts![3].length === 4); // 모바일문화상품권만 있는지

            // 선행 페이지 요청을 보내지 않으면 잘못된 접근 오류 발생
            const chargePageRequest = await this.client.get(
                onlyMobileVouchers ?
                "https://m.cultureland.co.kr/csh/cshGiftCard.do" : // 모바일문화상품권
                "https://m.cultureland.co.kr/csh/cshGiftCardOnline.do" // 문화상품권(18자리)
            ); // 문화상품권(18자리)에서 모바일문화상품권도 충전 가능, 모바일문화상품권에서 문화상품권(18자리) 충전 불가능
            if (chargePageRequest instanceof AxiosError) {
                return new CulturelandError("AxiosError", `GET ${
                    onlyMobileVouchers ?
                        "/csh/cshGiftCard.do" :
                        "/csh/cshGiftCardOnline.do"
                } 요청에 실패하였습니다.`, chargePageRequest);
            }

            const transKey = new mTransKey(this.cookieJar);
            const servletData = await transKey.getServletData();

            let pinCount = 1; // scr0x이 아닌 scr1x부터 시작하기 때문에 1부터 시작
            const scratches: KeyStringValueStringObject = {}; // scratch (핀번호)
            const keyboards: KeyStringValueStringObject[] = []; // keyIndex, keyboardType, fieldType
            const transkeys: KeyStringValueStringObject[] = []; // transkey, transkey_HM

            for (const pin of pins) {
                if (pin.parts === null) continue; // 유효하지 않은 핀번호의 경우 건너뛰기, 위에서 이미 확인하여 의미 없지만 린팅 이슈로 추가

                const scr4 = `scr${pinCount}4`, txtScr4 = `txtScr${pinCount}4`;

                // <input type="password" name="{scr4}" id="{txtScr4}">
                const keypad = transKey.createKeypad(servletData, "number", txtScr4, scr4);
                const keypadLayout = await keypad.getKeypadLayout();
                const encryptedPin = keypad.encryptPassword(pin.parts[3], keypadLayout);

                // scratch
                scratches[`scr${pinCount}1`] = pin.parts[0];
                scratches[`scr${pinCount}2`] = pin.parts[1];
                scratches[`scr${pinCount}3`] = pin.parts[2];
                scratches[scr4] = "*".repeat(pin.parts[3].length);

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
                ...scratches,
                seedKey: transKey.crypto.encSessionKey,
                initTime: servletData.initTime,
                transkeyUuid: transKey.crypto.transkeyUuid
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
            if (chargeRequest instanceof AxiosError) {
                return new CulturelandError("AxiosError", `POST ${
                    onlyMobileVouchers ?
                        "/csh/cshGiftCardProcess.do" :
                        "/csh/cshGiftCardOnlineProcess.do"
                } 요청에 실패하였습니다.`, chargeRequest);
            }

            const chargeResultRequest = await this.client.get("https://m.cultureland.co.kr" + chargeRequest.headers.location);
            if (chargeResultRequest instanceof AxiosError) {
                return new CulturelandError("AxiosError", `GET ${chargeRequest.headers.location} 요청에 실패하였습니다.`, chargeResultRequest);
            }

            const chargeResult: string = chargeResultRequest.data; // 충전 결과 받아오기

            const parsedResults = parse(chargeResult) // 충전 결과 HTML 파싱
                .getElementsByTagName("tbody")[0]
                .getElementsByTagName("tr");

            const results: CulturelandCharge[] = [];

            for (let i = 0; i < pins.length; i++) {
                const chargeResult = parsedResults[i].getElementsByTagName("td");

                results.push({
                    message: chargeResult[2].innerText,
                    amount: parseInt(chargeResult[3].innerText.replace(/,/g, "").replace("원", ""))
                });
            }

            return results;
        }
    }

    /**
     * 컬쳐캐쉬를 사용해 컬쳐랜드상품권(모바일문화상품권)을 본인 번호로 선물합니다.
     * @param amount 구매 금액 (최소 1천원부터 최대 5만원까지 100원 단위로 입력 가능)
     * @param quantity 구매 수량 (최대 5개)
     * @example
     * // 5000원권 1장을 나에게 선물
     * await client.gift(5000, 1);
     * @returns `pin`: Pin - 선물 바코드 번호
     * @returns `url`: string - 선물 바코드 URL
     */
    async gift(amount: number, quantity = 1): Promise<CulturelandGift | CulturelandError> {
        if (!(await this.isLogin())) throw new CulturelandError("LoginRequiredError", "로그인이 필요한 서비스 입니다.");

        // 구매 금액이 조건에 맞지 않을 때
        if (amount % 100 !== 0 || amount < 1000 || amount > 50000) {
            return new CulturelandError("RangeError", "구매 금액은 최소 1천원부터 최대 5만원까지 100원 단위로 입력 가능합니다.");
        }

        // 구매 수량이 조건에 맞지 않을 때
        if (quantity % 1 !== 0 || quantity < 1 || quantity > 5) {
            return new CulturelandError("RangeError", "구매 수량은 최소 1개부터 최대 5개까지 정수로 입력 가능합니다.");
        }

        // 유저정보 가져오기 (선물구매에 userKey 필요)
        const userInfo = await this.getUserInfo();
        if (userInfo instanceof CulturelandError) {
            return userInfo;
        }

        // 선행 페이지 요청을 보내지 않으면 잘못된 접근 오류 발생
        const giftPageRequest = await this.client.get("https://m.cultureland.co.kr/gft/gftPhoneApp.do");
        if (giftPageRequest instanceof AxiosError) {
            return new CulturelandError("AxiosError", "GET /gft/gftPhoneApp.do 요청에 실패하였습니다.", giftPageRequest);
        }

        // 내폰으로 전송 (본인 번호 가져옴)
        const phoneInfoRequest = await this.client.post("https://m.cultureland.co.kr/cpn/getGoogleRecvInfo.json", new URLSearchParams({
            sendType: "LMS",
            recvType: "M",
            cpnType: "GIFT"
        }).toString(), {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "Referer": "https://m.cultureland.co.kr/gft/gftPhoneApp.do"
            }
        });
        if (phoneInfoRequest instanceof AxiosError) {
            return new CulturelandError("AxiosError", "GET /cpn/getGoogleRecvInfo.json 요청에 실패하였습니다.", phoneInfoRequest);
        }

        const phoneInfo: PhoneInfoResponse = phoneInfoRequest.data;
        if (phoneInfo.errMsg !== "정상") {
            if (phoneInfo.errMsg) {
                return new CulturelandError("LookupError", phoneInfo.errMsg);
            }

            return new CulturelandError("ResponseError", "잘못된 응답이 반환되었습니다.");
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
        if (sendGiftRequest instanceof AxiosError) {
            return new CulturelandError("AxiosError", "POST /gft/gftPhoneCashProc.do 요청에 실패하였습니다.", sendGiftRequest);
        }

        const giftResultRequest = await this.client.get("https://m.cultureland.co.kr" + sendGiftRequest.headers.location);
        if (giftResultRequest instanceof AxiosError) {
            return new CulturelandError("AxiosError", `GET ${sendGiftRequest.headers.location} 요청에 실패하였습니다.`, giftResultRequest);
        }

        const giftResult: string = giftResultRequest.data; // 선물 결과 받아오기

        // 컬쳐랜드상품권(모바일문화상품권) 선물(구매)가 완료되었습니다.
        if (giftResult.includes("<strong> 컬쳐랜드상품권(모바일문화상품권) 선물(구매)가<br />완료되었습니다.</strong>")) {
            // 바코드의 코드 (URL 쿼리: code)
            const barcodeCode = giftResult.match(/<input type="hidden" id="barcodeImage"      name="barcodeImage"       value="https:\/\/m\.cultureland\.co\.kr\/csh\/mb\.do\?code=([\w/+=]+)" \/>/)?.[1];
            if (!barcodeCode) {
                return new CulturelandError("ResponseError", "선물 결과에서 바코드 URL을 찾을 수 없습니다.");
            }

            // 핀번호(바코드 번호)를 가져오기 위해 바코드 정보 요청
            const barcodePath = "/csh/mb.do?code=" + barcodeCode;
            const barcodeDataRequest = await this.client.get("https://m.cultureland.co.kr" + barcodePath);
            if (barcodeDataRequest instanceof AxiosError) {
                return new CulturelandError("AxiosError", `GET ${barcodePath} 요청에 실패하였습니다.`, barcodeDataRequest);
            }

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
        if (failReason) {
            return new CulturelandError("PurchaseError", failReason);
        }

        return new CulturelandError("ResponseError", "잘못된 응답이 반환되었습니다.");
    }

    /**
     * 선물하기 API에서 선물 한도를 가져옵니다.
     * @example
     * await client.getGiftLimit();
     * @returns `remain`: number - 잔여 선물 한도
     * @returns `limit`: number - 최대 선물 한도
     */
    async getGiftLimit(): Promise<CulturelandGiftLimit | CulturelandError> {
        if (!(await this.isLogin())) throw new CulturelandError("LoginRequiredError", "로그인이 필요한 서비스 입니다.");

        const limitInfoRequest = await this.client.post("https://m.cultureland.co.kr/gft/chkGiftLimitAmt.json");
        if (limitInfoRequest instanceof AxiosError) {
            return new CulturelandError("AxiosError", "POST /gft/chkGiftLimitAmt.json 요청에 실패하였습니다.", limitInfoRequest);
        }

        const limitInfo: GiftLimitResponse = limitInfoRequest.data;
        if (limitInfo.errMsg !== "정상") {
            if (limitInfo.errMsg) {
                return new CulturelandError("LookupError", limitInfo.errMsg);
            }

            return new CulturelandError("ResponseError", "잘못된 응답이 반환되었습니다.");
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
     * @returns `amount`: number - (전환 수수료 6%가 차감된) 전환된 금액
     */
    async changeCoupangCash(amount: number): Promise<CulturelandChangeCoupangCash | CulturelandError> {
        if (!(await this.isLogin())) throw new CulturelandError("LoginRequiredError", "로그인이 필요한 서비스 입니다.");

        // 전환 금액이 조건에 맞지 않을 때
        if (amount % 100 !== 0 || amount < 1000 || amount > 100_000) {
            return new CulturelandError("RangeError", "전환 금액은 최소 1천원부터 월 최대 10만원까지 100원 단위로 입력 가능합니다.");
        }

        // 선행 페이지에서 파라미터 가져옴
        const changeCoupangPageRequest = await this.client.get("https://m.cultureland.co.kr/chg/chgCoupangChange.do");
        if (changeCoupangPageRequest instanceof AxiosError) {
            return new CulturelandError("AxiosError", "GET /chg/chgCoupangChange.do 요청에 실패하였습니다.", changeCoupangPageRequest);
        }

        const changeCoupangPage: string = changeCoupangPageRequest.data;

        // 컬쳐캐쉬 캐시백 파라미터
        const eventCode = changeCoupangPage.match(/<input type="hidden" name="eventCode" id="eventCode" value="([^"]*)">/)?.[1] || "";
        const freeFeeRate = parseFloat(changeCoupangPage.match(/<input type="hidden" name="freeFeeRate" id="freeFeeRate" value="([\d.]+)">/)?.[1] || "0");
        const fee = parseFloat(changeCoupangPage.match(/<input type="hidden" name="fee" id="fee" value="([\d.]+)">/)?.[1] || "0.06");

        // 잔여 쿠팡캐시 전환한도
        const possibleAmount = changeCoupangPage.match(/<input type="hidden" name="PossibleAmount" id="PossibleAmount" value="(\d+)">/)?.[1] || "106300";
        if (parseInt(possibleAmount) === 0) {
            return new CulturelandError("RangeError", "당월 전환 가능 금액을 모두 소진하셨습니다.");
        }

        const changeCoupangCashRequest = await this.client.post("https://m.cultureland.co.kr/chg/chgCoupangChangeProc.json", new URLSearchParams({
            changeAmount: (amount * (1 - fee)).toString(),
            amount: amount.toString(),
            feeAmount: (amount * fee).toString(),
            freefeeAmount: (amount * freeFeeRate).toString(),
            eventCode,
            PossibleAmount: possibleAmount
        }).toString(), {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "Referer": "https://m.cultureland.co.kr/chg/chgCoupangChange.do"
            }
        });
        if (changeCoupangCashRequest instanceof AxiosError) {
            return new CulturelandError("AxiosError", "POST /chg/chgCoupangChangeProc.json 요청에 실패하였습니다.", changeCoupangCashRequest);
        }

        const changeCoupangCash: ChangeCoupangCashResponse = changeCoupangCashRequest.data;
        if (changeCoupangCash.resultCd !== "0000") {
            if (changeCoupangCash.resultMsg) {
                return new CulturelandError("PurchaseError", changeCoupangCash.resultMsg);
            }

            return new CulturelandError("ResponseError", "잘못된 응답이 반환되었습니다.");
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
     * @returns `amount`: number - (전환 수수료 5%가 과금된) 과금된 금액
     */
    async changeSmileCash(amount: number): Promise<CulturelandChangeSmileCash | CulturelandError> {
        if (!(await this.isLogin())) throw new CulturelandError("LoginRequiredError", "로그인이 필요한 서비스 입니다.");

        // 전환 금액이 조건에 맞지 않을 때
        if (amount % 100 !== 0 || amount < 1000 || amount > 2_000_000) {
            return new CulturelandError("RangeError", "전환 금액은 최소 1천원부터 월 최대 200만원까지 100원 단위로 입력 가능합니다.");
        }

        // 선행 페이지에서 파라미터 가져옴
        const changeSmileCashPageRequest = await this.client.get("https://m.cultureland.co.kr/chg/chgSmileCashChange.do");
        if (changeSmileCashPageRequest instanceof AxiosError) {
            return new CulturelandError("AxiosError", "GET /chg/chgSmileCashChange.do 요청에 실패하였습니다.", changeSmileCashPageRequest);
        }

        const changeSmileCashPage: string = changeSmileCashPageRequest.data;

        // 컬쳐캐쉬 캐시백 파라미터
        const eventCode = changeSmileCashPage.match(/<input type="hidden" name="eventCode" id="eventCode" value="([^"]*)">/)?.[1] || "";
        const freeFeeRate = parseFloat(changeSmileCashPage.match(/<input type="hidden" name="freeFeeRate" id="freeFeeRate" value="([\d.]+)">/)?.[1] || "0");
        const fee = 0.05;

        // 잔여 스마일캐시 전환한도
        const possibleAmount = changeSmileCashPage.match(/<input type="hidden" name="PossibleAmount" id="PossibleAmount" value="(\d+)">/)?.[1] || "106300";
        if (parseInt(possibleAmount) === 0) {
            return new CulturelandError("RangeError", "당월 전환 가능 금액을 모두 소진하셨습니다.");
        }

        const changeSmileCashRequest = await this.client.post("https://m.cultureland.co.kr/chg/chgSmileCashChangeProc.json", new URLSearchParams({
            changeAmount: amount.toString(),
            amount: (amount * (1 + fee)).toString(),
            feeAmount: (amount * fee).toString(),
            freefeeAmount: (amount * freeFeeRate).toString(),
            eventCode
        }).toString(), {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "Referer": "https://m.cultureland.co.kr/chg/chgSmileCashChange.do"
            }
        });
        if (changeSmileCashRequest instanceof AxiosError) {
            return new CulturelandError("AxiosError", "POST /chg/chgSmileCashChangeProc.json 요청에 실패하였습니다.", changeSmileCashRequest);
        }

        const changeSmileCash: ChangeSmileCashResponse = changeSmileCashRequest.data;
        if (changeSmileCash.resultCd !== "0000") {
            if (changeSmileCash.resultMsg) {
                return new CulturelandError("PurchaseError", changeSmileCash.resultMsg);
            }

            return new CulturelandError("ResponseError", "잘못된 응답이 반환되었습니다.");
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
     * @returns `pin`: string - 기프트 코드 번호
     * @returns `url`: string - 자동 입력 URL
     * @returns `certNo`: string - 카드번호
     */
    async giftGooglePlay(amount: number, quantity = 1): Promise<CulturelandGooglePlay[] | CulturelandError> {
        if (!(await this.isLogin())) throw new CulturelandError("LoginRequiredError", "로그인이 필요한 서비스 입니다.");

        // 구매 금액이 조건에 맞지 않을 때
        if (![5_000, 10_000, 15_000, 30_000, 50_000, 100_000, 150_000, 200_000].includes(amount)) {
            return new CulturelandError("RangeError", "구매 금액은 5천원, 1만원, 1만5천원, 3만원, 5만원, 10만원, 15만원, 20만원만 입력 가능합니다.");
        }

        // 구매 수량이 조건에 맞지 않을 때
        if (quantity % 1 !== 0 || quantity < 1 || quantity > 10) {
            return new CulturelandError("RangeError", "구매 수량은 최소 1개부터 최대 10개까지 정수로 입력 가능합니다.");
        }

        // 유저정보 가져오기 (기프트 코드 구매에 userKey 필요)
        const userInfo = await this.getUserInfo();
        if (userInfo instanceof CulturelandError) {
            return userInfo;
        }

        // 선행 페이지에서 파라미터 가져옴
        const googlePageRequest = await this.client.get("https://m.cultureland.co.kr/cpn/googleApp.do");
        if (googlePageRequest instanceof AxiosError) {
            return new CulturelandError("AxiosError", "GET /cpn/googleApp.do 요청에 실패하였습니다.", googlePageRequest);
        }

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
        }).toString(), {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "Referer": "https://m.cultureland.co.kr/cpn/googleApp.do"
            }
        });
        if (phoneInfoRequest instanceof AxiosError) {
            return new CulturelandError("AxiosError", "GET /cpn/getGoogleRecvInfo.json 요청에 실패하였습니다.", phoneInfoRequest);
        }

        const phoneInfo: PhoneInfoResponse = phoneInfoRequest.data;
        if (phoneInfo.errMsg !== "정상") {
            if (phoneInfo.errMsg) {
                return new CulturelandError("LookupError", phoneInfo.errMsg);
            }

            return new CulturelandError("ResponseError", "잘못된 응답이 반환되었습니다.");
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
        }).toString(), {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "Referer": "https://m.cultureland.co.kr/cpn/googleBuyHis.do"
            }
        });
        if (oldGoogleHistoryRequest instanceof AxiosError) {
            return new CulturelandError("AxiosError", "POST /cpn/googleBuyHisItem.json 요청에 실패하였습니다.", oldGoogleHistoryRequest);
        }

        const oldGoogleHistory: GooglePlayHistoryResponse = oldGoogleHistoryRequest.data;

        const payload = [
            [ "tfsSeq", tfsSeq ],
            [ "clientType", clientType ],
            [ "fee", fee.toString() ],
            [ "feeAmount", (amount * fee).toString() ],
            [ "freefeeAmount", (amount * (parseFloat(freeFeeRate ?? "0") || 0)).toString() ],
            [ "freeFeeYn", freeFeeYn ],
            [ "freefeeReaminAmt", freefeeReaminAmt ],
            [ "freeFeeRate", freeFeeRate ],
            [ "freeFeeEvUseYN", freeFeeEvUseYN ],
            [ "eventCode", eventCode ],
            [ "cpnType", cpnType ],
            [ "MallIP", MallIP ],
            [ "UserIP", UserIP ],
            [ "ediDate", ediDate ],
            [ "EncryptData", EncryptData ],
            [ "MallReserved", decodeURIComponent(MallReserved) ],
            [ "PayMethod", PayMethod ],
            [ "GoodsName", decodeURIComponent(GoodsName) ],
            [ "Amt", (amount * (1 + fee)).toString() ],
            [ "EncodingType", EncodingType ],
            [ "TransType", TransType ],
            [ "MID", MID ],
            [ "SUB_ID", SUB_ID ],
            [ "ReturnURL", decodeURIComponent(ReturnURL) ],
            [ "RetryURL", decodeURIComponent(RetryURL) ],
            [ "mallUserID", mallUserID ],
            [ "BuyerName", decodeURIComponent(BuyerName) ],
            [ "Moid", Moid ],
            [ "popupUrl", decodeURIComponent(popupUrl) ],
            [ "BuyerTel", userInfo.phone! ],
            [ "BuyerEmail", decodeURIComponent(BuyerEmail) ],
            [ "BuyerAddr", BuyerAddr ],
            [ "merchantKey", merchantKey ],
            [ "email", email ],
            [ "Email1", Email1 ],
            [ "Email2", Email2 ],
            [ "discount", discount ],
            [ "cardcode", cardcode ],
            [ "Md5MallReserved", decodeURIComponent(Md5MallReserved) ],
            [ "orderid", orderid ],
            [ "itemname", decodeURIComponent(itemname) ],
            [ "useragent", useragent ],
            [ "sendType", "LMS" ],
            [ "amount", amount.toString() ],
            [ "quantity", quantity.toString() ],
            [ "quantity", quantity.toString() ],
            [ "rdSendType", "rdlms" ],
            [ "chkLms", "M" ],
            [ "recvHP", userInfo.phone! ],
            [ "email", "" ],
            [ "buyType", "CASH" ],
            [ "chkAgree_paytus", "on" ]
        ].map(kv => kv.map(encodeURIComponent).join("=")).join("&").replace(/%20/g, "+");

        const sendGoogleRequest = await this.client.post("https://m.cultureland.co.kr/cpn/googleBuyProc.json", payload, {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "Referer": "https://m.cultureland.co.kr/cpn/googleApp.do"
            }
        });
        if (sendGoogleRequest instanceof AxiosError) {
            return new CulturelandError("AxiosError", "POST /cpn/googleBuyProc.json 요청에 실패하였습니다.", sendGoogleRequest);
        }

        const sendGoogle: GooglePlayBuyResponse = sendGoogleRequest.data;

        if (sendGoogle.errCd === "0" && sendGoogle.errMsg === "정상") {
            // PASS
        }
        else if (sendGoogle.errCd == "1001") {
            return new CulturelandError("SafeLockRequiredError", "안심금고 서비스 가입 후 Google Play 기프트 코드 구매가 가능합니다.");
        }
        else if (sendGoogle.errCd == "1108") {
            return new CulturelandError("ItemUnavailableError", "현재 선택하신 상품은 일시 품절입니다. 다른 권종의 상품으로 구매해 주세요.");
        }
        else if (sendGoogle.errCd == "-998") {
            return new CulturelandError("PurchaseRestrictedError", "전용계좌,계좌이체,무통장입금으로 컬쳐캐쉬를 충전하신 경우 안전한 서비스 이용을 위해 구매 및 선물 서비스가 제한됩니다. 자세한 문의사항은 고객센터(1577-2111)로 문의주시기 바랍니다.");
        }
        else if (sendGoogle.pinBuyYn == "Y") {
            return new CulturelandError("DeliverFailError", "발송에 실패 하였습니다. 구매내역에서 재발송 해주세요!");
        }
        else if (sendGoogle.pinBuyYn == "N") {
            return new CulturelandError("PurchaseError", `구매에 실패 하였습니다. (실패 사유 : ${sendGoogle.errMsg}) 다시 구매해 주세요!`);
        }
        else if (sendGoogle.errMsg) {
            return new CulturelandError("PurchaseError", sendGoogle.errMsg.replace(/<br>/g, " "));
        }
        else {
            return new CulturelandError("ResponseError", "잘못된 응답이 반환되었습니다.");
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
        }).toString(), {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "Referer": "https://m.cultureland.co.kr/cpn/googleBuyHis.do"
            }
        });
        if (googleHistoryRequest instanceof AxiosError) {
            return new CulturelandError("AxiosError", "POST /cpn/googleBuyHisItem.json 요청에 실패하였습니다.", googleHistoryRequest);
        }

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
            }).toString(), {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                    "Referer": "https://m.cultureland.co.kr/cpn/googleBuyHis.do"
                }
            });
            if (googleHistoryRequest instanceof AxiosError) {
                return new CulturelandError("AxiosError", "POST /cpn/googleBuyHisItem.json 요청에 실패하였습니다.", googleHistoryRequest);
            }

            googleHistory = googleHistoryRequest.data;
        }

        // 기프트 코드 구매 내역의 수가 구매한 기프트 코드의 수만큼 변하지 않음
        if (googleHistory.cpnVO.totalCnt !== oldGoogleHistory.cpnVO.totalCnt + quantity) {
            return new CulturelandError("LookupError", "구매한 기프트 코드의 정보를 가져올 수 없습니다. 본인 번호로 발송된 코드를 확인해 주세요.");
        }

        // 구매 전 기프트 코드 내역과 대조
        const googleGifts = googleHistory.list.filter(
            history =>
                parseInt(history.item.Amount) === amount &&
                parseInt(history.item.FaceValue) === amount &&
                history.item.ReceiveInfo === userInfo.phone &&
                !oldGoogleHistory.list.find(_history => _history.item.ScrachNo === history.item.ScrachNo)
        );

        // 새로운 기프트 코드 구매 내역의 수가 구매한 기프트 코드의 수와 일치하지 않음
        if (googleGifts.length !== quantity) {
            return new CulturelandError("LookupError", "구매한 기프트 코드의 정보를 가져올 수 없습니다. 본인 번호로 발송된 코드를 확인해 주세요.");
        }

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
     * @returns `phone`: string - 휴대폰 번호
     * @returns `safeLevel`: number - 안심금고 레벨
     * @returns `safePassword`: boolean - 안심금고 비밀번호 여부
     * @returns `registerDate`: number - 가입일 타임스탬프
     * @returns `userId`: string - 컬쳐랜드 ID
     * @returns `userKey`: string - 유저 고유 번호
     * @returns `userIp`: string - 접속 IP
     * @returns `index`: number - 유저 고유 인덱스
     * @returns `category`: string - 유저 종류
     */
    async getUserInfo(): Promise<CulturelandUser | CulturelandError> {
        if (!(await this.isLogin())) throw new CulturelandError("LoginRequiredError", "로그인이 필요한 서비스 입니다.");

        const userInfoRequest = await this.client.post("https://m.cultureland.co.kr/tgl/flagSecCash.json");
        if (userInfoRequest instanceof AxiosError) {
            return new CulturelandError("AxiosError", "POST /tgl/flagSecCash.json 요청에 실패하였습니다.", userInfoRequest);
        }

        const userInfo: UserInfoResponse = userInfoRequest.data;
        if (userInfo.resultMessage !== "성공") {
            if (userInfo.resultMessage) {
                return new CulturelandError("LookupError", userInfo.resultMessage);
            }

            return new CulturelandError("ResponseError", "잘못된 응답이 반환되었습니다.");
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
     * @returns `id`: string - 컬쳐랜드 ID
     * @returns `name`: string - 멤버의 이름 | `홍*동`
     * @returns `verificationLevel`: string - 멤버의 인증 등급 | `본인인증`
     */
    async getMemberInfo(): Promise<CulturelandMember | CulturelandError> {
        if (!(await this.isLogin())) throw new CulturelandError("LoginRequiredError", "로그인이 필요한 서비스 입니다.");

        const memberInfoRequest = await this.client.post("https://m.cultureland.co.kr/mmb/mmbMain.do");
        if (memberInfoRequest instanceof AxiosError) {
            return new CulturelandError("AxiosError", "POST /mmb/mmbMain.do 요청에 실패하였습니다.", memberInfoRequest);
        }

        const memberInfo: string = memberInfoRequest.data;

        if (!memberInfo.includes("meTop_info")) {
            return new CulturelandError("LookupError", "멤버 정보를 가져올 수 없습니다.");
        }

        const memberData = parse(memberInfo) // 멤버 정보 HTML 파싱
            .getElementById("meTop_info")!;

        return {
            id: memberData.getElementsByTagName("span")[0].innerText,
            name: memberData.getElementsByTagName("strong")[0].innerText.trim(),
            verificationLevel: memberData.getElementsByTagName("p")[0].innerText
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
     * @returns `[].title`: string - 내역 제목
     * @returns `[].merchantCode`: string - 사용 가맹점 코드
     * @returns `[].merchantName`: string - 사용 가맹점 이름
     * @returns `[].amount`: number - 사용 금액
     * @returns `[].balance`: number - 사용 후 남은 잔액
     * @returns `[].spendType`: string - 사용 종류 | `사용`, `사용취소`, `충전`
     * @returns `[].timestamp`: number - 내역 시간
     */
    async getCultureCashLogs(days: number, pageSize = 20, page = 1): Promise<CulturelandCashLogs | CulturelandError> {
        if (!(await this.isLogin())) throw new CulturelandError("LoginRequiredError", "로그인이 필요한 서비스 입니다.");

        const cashLogsRequest = await this.client.post("https://m.cultureland.co.kr/tgl/cashList.json", new URLSearchParams({
            addDay: (days - 1).toString(),
            pageSize: pageSize.toString(),
            page: page.toString()
        }).toString(), {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "Referer": "https://m.cultureland.co.kr/tgl/cashSearch.do"
            }
        });
        if (cashLogsRequest instanceof AxiosError) {
            return new CulturelandError("AxiosError", "POST /tgl/cashList.json 요청에 실패하였습니다.", cashLogsRequest);
        }

        const cashLogs: CashLogsResponse = cashLogsRequest.data;

        return cashLogs.map(log => ({
            title: log.item.Note,
            merchantCode: log.item.memberCode,
            merchantName: log.item.memberName,
            amount: parseInt(log.item.inAmount) - parseInt(log.item.outAmount),
            balance: parseInt(log.item.balance),
            spendType: log.item.accType,
            timestamp: Date.parse(log.item.accDate.replace(/(\d{4})(\d{2})(\d{2})/g, "$1-$2-$3") + " " + log.item.accTime.replace(/(\d{2})(\d{2})(\d{2})/g, "$1:$2:$3"))
        }));
    }

    /**
     * 현재 세션이 컬쳐랜드에 로그인되어 있는지 확인합니다.
     * @example
     * await client.isLogin();
     * @returns 로그인 여부
     */
    async isLogin() {
        const isLoginRequest = await this.client.post("https://m.cultureland.co.kr/mmb/isLogin.json");
        if (isLoginRequest instanceof AxiosError) return false;

        const isLogin = isLoginRequest.data;
        if (typeof isLogin !== "boolean") return false;

        return isLogin;
    }

    /**
     * ID와 비밀번호로 컬쳐랜드에 로그인합니다.
     * @param id 컬쳐랜드 ID
     * @param password 컬쳐랜드 비밀번호
     * @param captchaKey CapMonster API 키 (로그인 보안 그림 인증시 필요)
     * @param browserId 브라우저 아이디 `/assets/js/egovframework/com/cland/was/mmb/loginMain.js?version=1.0` L19
     * @param macAddress 임의의 MAC 주소 `/assets/js/egovframework/com/cland/was/mmb/loginMain.js?version=1.0` L28
     * @example
     * await client.login("test1234", "test1234!");
     * @returns `keepLoginInfo`: string - 로그인 유지 정보
     * @returns `browserId`: string - 브라우저 아이디
     * @returns `macAddress`: string - 임의의 MAC 주소
     */
    async login(id: string, password: string, captchaKey: string | null = null, browserId: string | null = null, macAddress: string | null = null): Promise<CulturelandLogin | CulturelandError> {
        // 브라우저 아이디가 없을 때
        if (browserId === null) {
            browserId = crypto.randomBytes(16).toString("hex");
        }

        // MAC 주소가 없을 때
        if (macAddress === null) {
            const macAddressRequest = await this.client.post("https://m.cultureland.co.kr/mmb/macAddrSelect.json", "flag=newMacAddr", {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                    "Referer": "https://m.cultureland.co.kr/mmb/loginMain.do"
                }
            });
            if (macAddressRequest instanceof AxiosError) {
                return new CulturelandError("AxiosError", "POST /mmb/macAddrSelect.json 요청에 실패하였습니다.", macAddressRequest);
            }

            macAddress = macAddressRequest.data.newMacAddr ?? crypto.randomBytes(15).toString("hex").toUpperCase();
        }

        const transKey = new mTransKey(this.cookieJar);
        const servletData = await transKey.getServletData();

        const keypad = transKey.createKeypad(servletData, "qwerty", "passwd", "passwd");
        const keypadLayout = await keypad.getKeypadLayout();
        const encryptedPassword = keypad.encryptPassword(password, keypadLayout);

        let captchaResponse = "";
        if (captchaKey === null) { // 캡챠키를 입력하지 않았을 경우
            // 0-9a-zA-Z 랜덤 string 생성 (64글자)
            const randomString = new Array(64).fill("").map(
                () =>
                    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".charAt(Math.random() * 62)
            ).join("");

            // KeepLoginConfig 쿠키를 사용할 경우 hCaptcha 값의 유효 여부를 확인하지 않는 취약점 사용
            await this.cookieJar.setCookie(
                new Cookie({ key: "KeepLoginConfig", value: randomString }),
                "https://m.cultureland.co.kr"
            );
        }
        else {
            const capMonster = new CapMonster(captchaKey);

            // CapMonster API에게 컬쳐랜드 로그인 hCaptcha 해결 요청
            const taskId = await capMonster.createTask("HCaptchaTaskProxyless", "https://m.cultureland.co.kr/mmb/loginMain.do", "3818bcdf-30ee-4d2f-bfd3-55dda192c639", true);

            // 캡챠 해결이 완료될 때까지 기다리고 응답 받아오기
            const captchaResult = await capMonster.awaitTaskResult(taskId!);

            if (!captchaResult.success) {
                return new CulturelandError("CaptchaError", "보안 그림 인증 실패 하였습니다. 다시 시도해주세요.");
            }

            captchaResponse = captchaResult.solution!;
        }

        const requestBody = new URLSearchParams({
            keepLoginInfo: "",
            hidWebType: "other",
            browserId: browserId!,
            newMacAddr: macAddress!,
            checkhCaptcha: captchaResponse,
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
            validateStatus: status => status === 200 || status === 302,
            proxy: this.proxy ?? false
        });
        if (loginRequest instanceof AxiosError) {
            return new CulturelandError("AxiosError", "POST /mmb/loginProcess.do 요청에 실패하였습니다.", loginRequest);
        }

        // 메인 페이지로 리다이렉션되지 않은 경우
        if (loginRequest.status === 200) {
            const errorMessage = loginRequest.data.match(/<input type="hidden" name="loginErrMsg"  value="([^"]+)" \/>/)?.[1];
            if (errorMessage) {
                return new CulturelandError("LoginError", errorMessage);
            }

            return new CulturelandError("ResponseError", "잘못된 응답이 반환되었습니다.");
        }

        // 컬쳐랜드 로그인 정책에 따라 로그인이 제한된 경우
        if (loginRequest.headers.location === "/cmp/authConfirm.do") {
            const errorPageRequest = await this.client.get("https://m.cultureland.co.kr" + loginRequest.headers.location);
            if (errorPageRequest instanceof AxiosError) {
                return new CulturelandError("AxiosError", `GET ${loginRequest.headers.location} 요청에 실패하였습니다.`, errorPageRequest);
            }

            const errorPage: string = errorPageRequest.data;

            // 제한코드 가져오기
            const errorCode = errorPage.match(/var errCode = "(\d+)";/)?.[1];
            if (errorCode) {
                return new CulturelandError("LoginRestrictedError", `컬쳐랜드 로그인 정책에 따라 로그인이 제한되었습니다. (제한코드 ${errorCode})`);
            }

            return new CulturelandError("LoginRestrictedError", "컬쳐랜드 로그인 정책에 따라 로그인이 제한되었습니다.");
        }

        // 로그인 유지 정보 가져오기
        const keepLoginInfoCookie = loginRequest.headers["set-cookie"]?.find(cookie => cookie.startsWith("KeepLoginConfig="));
        if (keepLoginInfoCookie) {
            const keepLoginInfo = keepLoginInfoCookie.split("=")[1].split(";")[0];
            return {
                keepLoginInfo: decodeURIComponent(keepLoginInfo),
                browserId,
                macAddress: macAddress!
            };
        }
        else {
            return {
                browserId,
                macAddress: macAddress!
            };
        }
    }

    /**
     * 로그인 유지 정보로 컬쳐랜드에 로그인합니다.
     * @param keepLoginInfo 로그인 유지 정보 `keepLoginConfig`
     * @param browserId 브라우저 아이디 `/assets/js/egovframework/com/cland/was/mmb/loginMain.js?version=1.0` L19
     * @param macAddress 임의의 MAC 주소 `/assets/js/egovframework/com/cland/was/mmb/loginMain.js?version=1.0` L28
     * @example
     * const keepLoginInfo = await cookieStore.get("KeepLoginConfig")
     *     .then(cookie => decodeURIComponent(cookie.value));
     * 
     * await client.loginWithKeepLoginInfo(keepLoginInfo);
     * @returns `userId` 컬쳐랜드 ID
     * @returns `keepLoginInfo`?: string - 로그인 유지 쿠키
     * @returns `browserId`: string - 브라우저 아이디
     * @returns `macAddress`: string - 임의의 MAC 주소
     */
    async loginWithKeepLoginInfo(keepLoginInfo: string, browserId: string | null = null, macAddress: string | null = null): Promise<CulturelandLoginWithKeepLoginInfo | CulturelandError> {
        // 로그인 유지 정보를 쿠키에 저장
        await this.cookieJar.setCookie(
            new Cookie({ key: "KeepLoginConfig", value: encodeURIComponent(keepLoginInfo) }),
            "https://m.cultureland.co.kr"
        );

        const loginMainRequest = await this.client.get("https://m.cultureland.co.kr/mmb/loginMain.do", {
            headers: {
                "Referer": "https://m.cultureland.co.kr/index.do"
            }
        });
        if (loginMainRequest instanceof AxiosError) {
            return new CulturelandError("AxiosError", "GET /mmb/loginMain.do 요청에 실패하였습니다.", loginMainRequest);
        }

        const loginMain: string = loginMainRequest.data;

        const userId = loginMain.match(/<input type="text" id="txtUserId" name="userId" value="(\w*)" maxlength="12" oninput="maxLengthCheck\(this\);" placeholder="아이디" >/)?.[1] ?? "";

        if (!userId) {
            return new CulturelandError("LoginError", "입력하신 아이디 또는 비밀번호가 틀립니다");
        }

        // 브라우저 아이디가 없을 때
        if (browserId === null) {
            browserId = crypto.randomBytes(16).toString("hex");
        }

        // MAC 주소가 없을 때
        if (macAddress === null) {
            const macAddressRequest = await this.client.post("https://m.cultureland.co.kr/mmb/macAddrSelect.json", "flag=newMacAddr", {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                    "Referer": "https://m.cultureland.co.kr/mmb/loginMain.do"
                }
            });
            if (macAddressRequest instanceof AxiosError) {
                return new CulturelandError("AxiosError", "POST /mmb/macAddrSelect.json 요청에 실패하였습니다.", macAddressRequest);
            }

            macAddress = macAddressRequest.data.newMacAddr ?? crypto.randomBytes(15).toString("hex").toUpperCase();
        }

        const transKey = new mTransKey(this.cookieJar);
        const servletData = await transKey.getServletData();

        const keypad = transKey.createKeypad(servletData, "qwerty", "passwd", "passwd");
        const keypadLayout = await keypad.getKeypadLayout();
        const encryptedPassword = keypad.encryptPassword("", keypadLayout);

        const requestBody = new URLSearchParams({
            keepLoginInfo: keepLoginInfo,
            hidWebType: "",
            browserId,
            newMacAddr: macAddress!,
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
        }).toString();

        const loginRequest = await this.client.post("https://m.cultureland.co.kr/mmb/loginProcess.do", requestBody, {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Referer": "https://m.cultureland.co.kr/mmb/loginMain.do"
            },
            maxRedirects: 0,
            validateStatus: status => status === 200 || status === 302,
            proxy: this.proxy ?? false
        });
        if (loginRequest instanceof AxiosError) {
            return new CulturelandError("AxiosError", "POST /mmb/loginProcess.do 요청에 실패하였습니다.", loginRequest);
        }

        // 메인 페이지로 리다이렉션되지 않은 경우
        if (loginRequest.status === 200) {
            const errorMessage = loginRequest.data.match(/<input type="hidden" name="loginErrMsg"  value="([^"]+)" \/>/)?.[1];
            if (errorMessage) {
                return new CulturelandError("LoginError", errorMessage);
            }

            return new CulturelandError("ResponseError", "잘못된 응답이 반환되었습니다.");
        }

        // 컬쳐랜드 로그인 정책에 따라 로그인이 제한된 경우
        if (loginRequest.headers.location === "/cmp/authConfirm.do") {
            const errorPageRequest = await this.client.get("https://m.cultureland.co.kr" + loginRequest.headers.location);
            if (errorPageRequest instanceof AxiosError) {
                return new CulturelandError("AxiosError", `GET ${loginRequest.headers.location} 요청에 실패하였습니다.`, errorPageRequest);
            }

            const errorPage: string = errorPageRequest.data;

            // 제한코드 가져오기
            const errorCode = errorPage.match(/var errCode = "(\d+)";/)?.[1];
            if (errorCode) {
                return new CulturelandError("LoginRestrictedError", `컬쳐랜드 로그인 정책에 따라 로그인이 제한되었습니다. (제한코드 ${errorCode})`);
            }

            return new CulturelandError("LoginRestrictedError", "컬쳐랜드 로그인 정책에 따라 로그인이 제한되었습니다.");
        }

        // 로그인 유지 정보 가져오기
        const keepLoginInfoCookie = loginRequest.headers["set-cookie"]?.find(cookie => cookie.startsWith("KeepLoginConfig="));
        if (keepLoginInfoCookie) {
            const keepLoginInfo = keepLoginInfoCookie.split("=")[1].split(";")[0];
            return {
                userId,
                keepLoginInfo: decodeURIComponent(keepLoginInfo),
                browserId,
                macAddress: macAddress!
            };
        }
        else {
            return {
                userId,
                browserId,
                macAddress: macAddress!
            };
        }
    }
}
