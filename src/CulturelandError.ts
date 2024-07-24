
/**
 * @example
 * "ResponseError" - 서버로부터 잘못된 응답을 받았을 경우
 * "LoginRequiredError" - 로그인이 되어있지 않은 경우
 * "InvalidPinError" - 유효하지 않은 핀번호를 사용하였을 경우
 * "RangeError" - 범위를 벗어난 값을 입력한 경우
 * "SafeLockRequiredError" - 안심금고가 활성화되어있지 않은 경우
 * "ItemUnavailableError" - 구매가 불가능한 상품을 구매하려는 경우
 * "PurchaseRestrictedError" - 이 계정에서 구매가 제한된 경우
 * "DeliverFailError" - 구매가 완료되었지만 메시지/알림톡/메일 전송에 실패한 경우
 * "PurchaseError" - 구매에 실패한 경우
 * "LookupError" - 조회에 실패한 경우
 * "CaptchaError" - 캡챠 해결에 실패한 경우
 * "LoginError" - 로그인에 실패한 경우
 * "LoginRestrictedError" - 계정 혹은 IP 주소가 로그인을 제한당한 경우
 * "PinValidationError" - 컬쳐랜드 핀 번호 형식이 올바르지 않은 경우
 */
export type CulturelandErrorNames =
    "ResponseError" | "LoginRequiredError" | "InvalidPinError" |
    "RangeError" | "SafeLockRequiredError" | "ItemUnavailableError" |
    "PurchaseRestrictedError" | "DeliverFailError" | "PurchaseError" |
    "LookupError" | "CaptchaError" | "LoginError" | "LoginRestrictedError" |
    "PinValidationError" | "UnknownError";

/**
 * 커스텀 오류 클래스입니다.
 * 오류가 발생할 경우 Error 대신 이 클래스가 반환됩니다.
 */
export class CulturelandError extends Error {
    private _name: CulturelandErrorNames;

    /**
     * @param name 오류 이름
     * @param message 오류 메시지
     */
    public constructor(name: CulturelandErrorNames, message: string, public additionalValues?: any) {
        super(message);
        this._name = name;
    }

    /**
     * 오류 이름
     */
    public get name() {
        return this._name;
    }
}

export default CulturelandError;