import Pin from "./Pin.js";

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
    message: string;
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
    pin: Pin;
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
    remain: number;
    limit: number;
}

export interface ChangeCoupangCashResponse {
    resultCd: string;
    resultMsg: string;
}

export interface CulturelandChangeCoupangCash {
    amount: number;
}

export interface ChangeSmileCashResponse {
    resultCd: string;
    resultMsg: string;
}

export interface CulturelandChangeSmileCash {
    amount: number;
}

export interface CulturelandGooglePlay {
    pin: string;
    url: string;
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
    phone: string;
    safeLevel: number;
    safePassword: boolean;
    registerDate: number;
    userId: string;
    userKey: string;
    userIp: string;
    index: number;
    category: string;
}

export interface CulturelandMember {
    id?: string;
    name?: string;
    verificationLevel?: string;
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
    title: string,
    merchantCode: string,
    merchantName: string,
    amount: number,
    balance: number,
    spendType: string,
    timestamp: number
};

export type CulturelandCashLogs = CulturelandCashLog[];

export interface CulturelandLogin {
    keepLoginInfo?: string;
    browserId: string;
    macAddress: string;
}

export type CulturelandLoginWithKeepLoginInfo = CulturelandLogin & {
    userId: string;
}