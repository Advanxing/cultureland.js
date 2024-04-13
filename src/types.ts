export interface KeyStringValueStringObject {
    [key: string]: string;
}

export interface CulturelandVoucher {
    success: boolean;
    message: string;
    data?: any;
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
    success: boolean;
    message: string;
    balance: number;
    safeBalance: number;
    totalBalance: number;
}

export interface CulturelandCharge {
    success: boolean;
    message: string;
    amount?: number;
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
    success: boolean;
    message: string;
    pin?: string;
    url?: string;
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
    success: boolean;
    message: string;
    remain?: number;
    limit?: number;
}

export interface ChangeCoupangCashResponse {
    resultCd: string;
    resultMsg: string;
}

export interface CulturelandChangeCoupangCash {
    success: boolean;
    message: string;
}

export interface ChangeSmileCashResponse {
    resultCd: string;
    resultMsg: string;
}

export interface CulturelandChangeSmileCash {
    success: boolean;
    message: string;
}

export interface CulturelandGooglePlay {
    success: boolean;
    message: string;
    pin?: string;
    url?: string;
    certNo?: string;
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
    success: boolean;
    message: string;
    phone?: string;
    safeLevel?: number;
    safePassword?: boolean;
    registerDate?: string;
    userId?: string;
    userKey?: string;
    userIp?: string;
    index?: number;
    category?: string;
}

export interface CulturelandMember {
    success: boolean;
    message: "성공" | "멤버 정보를 가져올 수 없습니다.";
    id?: string;
    name?: string;
    verificationLevel?: string;
}

export type CashLogsResponse = {
    item: {
        accDate: string;
        memberCode: string;
        outAmount: string;
        balance: string;
        inAmount: string;
        NUM: string;
        Note: string;
        accTime: string;
        memberName: string;
        accType: string;
        safeAmount: string;
    };
}[]

export interface CulturelandCashLogs {
    success: boolean;
    message: string;
    logs: {
        title: string;
        merchantCode: string;
        merchantName: string;
        amount: number;
        balance: number;
        spendType: string;
        timestamp: number;
    }[]
}

export interface CulturelandVoucherFormat {
    success: boolean;
    message: string;
    parts?: [string, string, string, string];
}

export interface CreateTask {
    errorId: number;
    errorCode: string;
    errorDescription: string;
    taskId?: number;
}

export interface TaskResult {
    errorId: number;
    errorCode: string | null;
    errorDescription: string | null;
    solution: {
        userAgent: string;
        respKey?: string;
        gRecaptchaResponse: string;
    };
    status: string;
}