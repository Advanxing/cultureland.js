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