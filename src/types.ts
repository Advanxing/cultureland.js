import Pin from "./Pin.js";

export type CulturelandPinParts = [string, string, string, string];

export interface VoucherResponse {
    resultCd: string;
    resultOther: string;
    resultMsg: {
        item: {
            LevyTime: string;
            GCSubMemberName: string;
            State: string;
            levyamount: string;
            Store_name: string;
            LevyDate: string;
        }
    }[]
}

export type VoucherResultOther = {
    FaceValue: number,
    ExpiryDate: string,
    RegDate: string,
    State: string,
    CertNo: string,
    Balance: number
}[];

export interface SpendHistory {
    /**
     * 내역 제목
     */
    title: string;
    /**
     * 사용 가맹점 이름
     */
    merchantName: string;
    /**
     * 사용 금액
     */
    amount: number;
    /**
     * 사용 시각
     */
    timestamp: number;
}

export interface CulturelandVoucher {
    /**
     * 상품권의 금액
     */
    amount: number;
    /**
     * 상품권의 잔액
     */
    balance: number;
    /** 
     * 상품권의 발행번호 (인증번호)
     */
    certNo: string;
    /**
     * 상품권의 발행일 | `20241231`
     */
    createdDate: string;
    /**
     * 상품권의 만료일 | `20291231`
     */
    expiryDate: string;
    /**
     * 상품권 사용 내역
     */
    spendHistory: SpendHistory[];
}

export interface BalanceResponse {
    safeDelYn: "Y" | "N";
    memberKind: string;
    casChargeYN: "Y" | "N";
    resultCode: string;
    resultMessage: string;
    blnWaitCash: string;
    walletPinYN: "Y" | "N";
    bnkAmt: string;
    remainCash: string;
    transCash: string;
    myCash: string;
    blnAmt: string;
    walletYN: "Y" | "N";
    limitCash: string;
}

export interface CulturelandBalance {
    /**
     * 사용 가능 금액
     */
    balance: number;
    /**
     * 보관중인 금액 (안심금고)
     */
    safeBalance: number;
    /**
     * 총 잔액 (사용 가능 금액 + 보관중인 금액)
     */
    totalBalance: number;
}

export interface CulturelandCharge {
    /**
     * 성공 여부 메시지
     */
    message: "충전 완료" | "상품권지갑 보관" | "잔액이 0원인 상품권" | "상품권 번호 불일치";
    /**
     * 충전 금액
     */
    amount: number;
}

export interface PhoneInfoResponse {
    recvType: string;
    email2: string;
    errCd: string;
    email1: string;
    hpNo2: string;
    hpNo1: string;
    hpNo3: string;
    errMsg: string;
    sendType: string;
}

export interface CulturelandGift {
    /**
     * 선물 바코드 번호
     */
    pin: Pin;
    /**
     * 선물 바코드 URL
     */
    url: string;
}

export interface GiftLimitResponse {
    errCd: string;
    giftVO: {
        maxAmount: number;
        custCd: null;
        balanceAmt: number;
        safeAmt: number;
        cashGiftRemainAmt: number;
        cashGiftSumGift: number;
        cashGiftNoLimitYn: "Y" | "N";
        cashGiftNoLimitUserYn: string;
        cashGiftLimitAmt: number;
        cashGiftMGiftRemainDay: number;
        cashGiftMGiftRemainMon: number;
        toUserId: null;
        toUserNm: null;
        toMsg: null;
        transType: null;
        timestamp: null;
        certValue: null;
        revPhone: null;
        paymentType: null;
        sendType: null;
        sendTypeNm: null;
        giftCategory: null;
        sendTitl: null;
        amount: number;
        quantity: number;
        controlCd: null;
        lgControlCd: null;
        contentsCd: null;
        contentsNm: null;
        svrGubun: null;
        payType: null;
        levyDate: null;
        levyTime: null;
        levyDateTime: null;
        genreDtl: null;
        faceValue: number;
        sendCnt: number;
        balance: number;
        state: null;
        lgState: null;
        dtlState: null;
        selType: null;
        strPaymentType: null;
        strSendType: null;
        strRcvInfo: null;
        appUseYn: null;
        reSendYn: null;
        reSendState: null;
        strReSendState: null;
        cnclState: null;
        strCnclState: null;
        page: number;
        pageSize: number;
        totalCnt: number;
        totalSum: number;
        totalCntPage: number;
        isLastPageYn: null;
        reSendType: null;
        reSvrGubun: null;
        aESImage: null;
        sendUserId: null;
        sendUserNm: null;
        rcvUserKey: null;
        rcvUserID: null;
        rcvName: null;
        rcvHpno: null;
        sendMsg: null;
        giftType: null;
        sendDate: null;
        receiveDate: null;
        expireDate: null;
        cancelDate: null;
        cancelType: null;
        regdate: null;
        waitPage: number;
        sendPage: number;
        waitCnt: number;
        cancelCnt: number;
        transCnt: number;
        successCnt: number;
        nbankMGiftRemainDay: number;
        nbankNoLimitUserYn: string;
        nbankNoLimitYn: "Y" | "N";
        ccashNoLimitUserYn: string;
        ccashRemainAmt: number;
        ccashMGiftRemainMon: number;
        ccashMGiftRemainDay: number;
        nbankRemainAmt: number;
        rtimeNoLimitUserYn: string;
        ccashNoLimitYn: "Y" | "N";
        nbankMGiftRemainMon: number;
        rtimeMGiftRemainMon: number;
        rtimeMGiftRemainDay: number;
        rtimeNoLimitYn: "Y" | "N";
        rtimeRemainAmt: number;
        nbankLimitAmt: number;
        rtimeSumGift: number;
        ccashLimitAmt: number;
        nbankSumGift: number;
        nbankSumVacnt: number;
        rtimeLimitAmt: number;
        ccashSumGift: number;
    };
    errMsg: string;
}

export interface CulturelandGiftLimit {
    /**
     * 잔여 선물 한도
     */
    remain: number;
    /**
     * 최대 선물 한도
     */
    limit: number;
}

export interface ChangeCoupangCashResponse {
    resultCd: string;
    resultMsg: string;
}

export interface CulturelandChangeCoupangCash {
    /**
     * (전환 수수료 6%가 차감된) 전환된 금액
     */
    amount: number;
}

export interface ChangeSmileCashResponse {
    resultCd: string;
    resultMsg: string;
}

export interface CulturelandChangeSmileCash {
    /**
     * (전환 수수료 5%가 과금된) 과금된 금액
     */
    amount: number;
}

export interface CulturelandGooglePlay {
    /**
     * 기프트 코드 번호
     */
    pin: string;
    /**
     * 자동 입력 URL
     */
    url: string;
    /**
     * 카드번호
     */
    certNo: string;
}

export interface GooglePlayBuyResponse {
    errCd: string;
    pinBuyYn: "Y" | "N";
    errMsg: string;
}

export interface GooglePlayHistoryResponse {
    list: {
        item: {
            fee: string;
            reSendState: "Y" | "N";
            cnclState: "Y" | "N";
            strLevyDate: string;
            CertGroup: string;
            ContentsName: string;
            PurchaseCertNo: string;
            LevyTime: string;
            strMaskScrachNo: string;
            payType: "컬쳐캐쉬" | "신용카드";
            strRcvInfo: string;
            ReceiveInfo: string;
            culturelandGiftNo: string;
            ReSend: string;
            culturelandGiftMaskNo: string;
            ExSubMemberCode: string;
            certGroup: string;
            FaceValue: string;
            strLevyTime: string;
            levyDateTime: string;
            ContentsCode: "GOOGLE";
            Amount: string;
            ControlCode: string;
            PinSaleControlCode: string;
            cultureGiftFaceValue: string;
            RowNumber: string;
            CouponCode: string;
            GCSubMemberCode: string;
            CancelDate: string;
            ExMemberCode: string;
            State: string;
            SubMemberCode: string;
            googleDcUserHpCheck: "Y" | "N";
            MemberControlCode: string;
            CertNo: string;
            ScrachNo: string;
            LevyDate: string;
            cnclLmtDate: string;
        }
    }[];
    cpnVO: {
        buyType: null,
        cpgm: null;
        couponNm: null;
        contentsCd: null;
        alertAmt: null;
        couponAmt: null;
        saleAmt: null;
        comments: null;
        agreeMsg: null;
        serviceStatus: null;
        tfsSeq: null;
        hpNo1: null;
        hpNo2: null;
        hpNo3: null;
        recvHP: null;
        email1: null;
        email2: null;
        recvEmail: null;
        sendType: null;
        buyCoupon: null;
        direction: null;
        couponCode: null;
        memberCd: null;
        pinType: null;
        agencyNm: null;
        faceval: null;
        safeBalance: null;
        hp_no1: null;
        hp_no2: null;
        hp_no3: null;
        phoneNumber: null;
        prodNo: null;
        tmpCLState: null;
        res_code: null;
        datasize: null;
        salePercent: null;
        saleBuyLimit: null;
        isSale: 0;
        balance: 0;
        safeAmt: 0;
        amount: 0;
        arrCouponAmt: null;
        arrSaleAmt: null;
        arrSalePer: null;
        arrBuyCoupon: null;
        arrAlertAmt: null;
        arrCouponCode: null;
        arrCouponName: null;
        arrComments: null;
        couponCodeType: null;
        remainMAmount: null;
        remainDAmount: null;
        remainMAmountUser: null;
        remainDAmountUser: null;
        maxMAmountUser: null;
        maxDAmountUser: null;
        feeType: null;
        quantity: 0;
        page: number;
        pageSize: number;
        buyCnt: number;
        totalCnt: number;
        feeAmount: 0;
        fee: "0";
        isLastPageYn: "Y" | "N";
        controlCd: null;
        subMemberCd: null;
        pinSaleControlCd: null;
        recvInfo: null;
        code1: null;
        code2: null;
        code3: null;
        code4: null;
        code5: null;
        recvType: null;
        couponContent: null;
        oriAmount: null;
        isCulSale: 0;
        deliveryFee: 0;
        deliveryType: "";
        recvNm: "";
        recvPost: "";
        recvAddr1: "";
        recvAddr2: "";
        envelopeQty: 0;
        billCheck: "";
        isEvnFee: 0;
        evnFee: "0";
        evnFeeAmount: 0;
        freefeeAmount: 0;
        eventCode: null;
        cpnType: "";
        salePer: null;
    }
}

export interface UserInfoResponse {
    Del_Yn: "Y" | "N";
    callUrl: string;
    custCd: string;
    certVal: string;
    backUrl: string;
    authDttm: string;
    resultCode: string;
    user_key: string;
    Status_M: string;
    Phone: string;
    Status_Y: string;
    Status_W: string;
    Status: string;
    SafeLevel: string;
    Status_D: string;
    CashPwd: string;
    RegDate: string;
    resultMessage: string;
    userId: string;
    userKey: string;
    Proc_Date: string;
    size: number;
    user_id: string;
    succUrl: string;
    userIp: string;
    Mobile_Yn: "Y" | "N";
    idx: string;
    category: string;
}

export interface CulturelandUser {
    /**
     * 휴대폰 번호
     */
    phone: string;
    /**
     * 안심금고 레벨
     */
    safeLevel: number;
    /**
     * 안심금고 비밀번호 여부
     */
    safePassword: boolean;
    /**
     * 가입 시각
     */
    registerDate: number;
    /**
     * 컬쳐랜드 ID
     */
    userId: string;
    /**
     * 유저 고유 번호
     */
    userKey: string;
    /**
     * 접속 IP
     */
    userIp: string;
    /**
     * 유저 고유 인덱스
     */
    index: number;
    /**
     * 유저 종류
     */
    category: string;
}

export interface CulturelandMember {
    /**
     * 컬쳐랜드 ID
     */
    id?: string;
    /**
     * 멤버의 이름 | `홍*동`
     */
    name?: string;
    /**
     * 멤버의 인증 등급
     */
    verificationLevel?: "본인인증";
}

export type CashLogsResponse = {
    item: {
        accDate: string,
        memberCode: string,
        outAmount: string,
        balance: string,
        inAmount: string,
        NUM: string,
        Note: string,
        accTime: string,
        memberName: string,
        accType: string,
        safeAmount: string
    }
}[];

export interface CulturelandCashLog {
    /**
     * 내역 제목
     */
    title: string,
    /**
     * 사용 가맹점 코드
     */
    merchantCode: string,
    /**
     * 사용 가맹점 이름
     */
    merchantName: string,
    /**
     * 사용 금액
     */
    amount: number,
    /**
     * 사용 후 남은 잔액
     */
    balance: number,
    /**
     * 사용 종류
     */
    spendType: "사용" | "사용취소" | "충전",
    /**
     * 사용 시각
     */
    timestamp: number
};

export interface CulturelandLogin {
    /**
     * 로그인 유지 쿠키
     */
    keepLoginInfo?: string;
    /**
     * 브라우저 아이디
     */
    browserId: string;
    /**
     * 임의의 MAC 주소
     */
    macAddress: string;
}

export type CulturelandLoginWithKeepLoginInfo = CulturelandLogin & {
    /**
     * 컬쳐랜드 ID
     */
    userId: string;
}