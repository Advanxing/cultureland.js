import CulturelandError from "./CulturelandError";
import { CulturelandPinParts } from "./types";

/**
 * 핀번호를 관리하는 클래스입니다.
 * 핀번호 포맷팅에 사용됩니다.
 */
export class Pin {
    private _parts: CulturelandPinParts;

    /**
     * 핀번호를 자동으로 포맷팅합니다.
     * 핀번호가 유효하지 않은 경우 parts가 null을 반환합니다.
     * @param pin 상품권의 핀번호
     * @example
     * // 올바른 핀번호일 경우:
     * const pin = new Pin("3110-0123-4567-8901"); // new Pin("3110", "0123", "4567", "8901"), new Pin(["3110", "0123", "4567", "8901"])
     * console.log(pin.parts); // Output: ["3110", "0123", "4567", "8901"]
     * 
     * // 올바르지 않은 핀번호일 경우:
     * const pin = new Pin("swasd------"); // CulturelandError [PinValidationError]: 존재하지 않는 상품권입니다.
     */
    public constructor(pin: string)
    public constructor(pin: CulturelandPinParts)
    public constructor(pinPart1: string, pinPart2: string, pinPart3: string, pinPart4: string)
    public constructor(pin: string | CulturelandPinParts, part2?: string, part3?: string, part4?: string) {
        if (pin instanceof Array) pin = pin.join("-");
        else if (part4) pin = `${pin}-${part2}-${part3}-${part4}`;
        const validationResult = Pin.validateClientSide(pin);
        if (!validationResult) throw new CulturelandError("PinValidationError", "존재하지 않는 상품권입니다.");
        this._parts = Pin.format(pin)!;
    }

    /**
     * 포맷팅이 완료된 핀번호입니다.
     * @example
     * const pin = new Pin("3110-0123-4567-8901");
     * console.log(pin.parts); // Output: ["3110", "0123", "4567", "8901"]
     */
    public get parts() {
        return this._parts;
    }

    /**
     * 핀번호를 string으로 반환합니다.
     * @example
     * const pin = new Pin("3110-0123-4567-8901");
     * console.log(pin.toString()); // Output: "3110-0123-4567-8901"
     */
    public toString(): string {
        return this.parts.join("-");
    }

    /**
     * 핀번호를 CulturelandPinParts 형식으로 포매팅합니다.
     */
    public static format(pin: string) {
        if (!Pin.validateClientSide(pin)) return null;
        const pinMatches = pin.match(/(\d{4})\D*(\d{4})\D*(\d{4})\D*(\d{6}|\d{4})/)!;
        const parts: CulturelandPinParts = [pinMatches[1], pinMatches[2], pinMatches[3], pinMatches[4]];
        return parts;
    }

    /**
     * 핀번호의 유효성을 검증합니다.
     * 존재할 수 없는 핀번호를 검사하여 불필요한 요청을 사전에 방지합니다.
     * @param pin 상품권의 핀번호
     * @returns 핀번호를 4자리씩 끊은 배열 | ["3110", "0123", "4567", "8901"]
     */
    public static validateClientSide(pin: string) {
        const pinMatches = pin.match(/(\d{4})\D*(\d{4})\D*(\d{4})\D*(\d{6}|\d{4})/); // 1111!@#!@#@#@!#!@#-1111-1111DSSASDA-1111와 같은 형식도 PASS됨.
        if (!pinMatches) { // 핀번호 regex에 맞지 않는다면 검증 실패
            return false;
            // throw new CulturelandError("PinValidationError", "핀번호 Regex 검증에 실패했습니다.");
        }

        const parts: CulturelandPinParts = [pinMatches[1], pinMatches[2], pinMatches[3], pinMatches[4]];
        if (parts[0].startsWith("416") || parts[0].startsWith("4180")) { // 핀번호가 416(컬쳐랜드상품권 구권) 또는 4180(컬쳐랜드상품권 신권)으로 시작한다면
            if (parts[3].length !== 4) { // 마지막 핀번호 부분이 4자리가 아니라면 검증 실패
                return false;
                // throw new CulturelandError("PinValidationError", "마지막 핀 파트가 4자리가 아닙니다.");
            }
        } else if (parts[0].startsWith("41")) { // 핀번호가 41로 시작하지만 416 또는 4180으로 시작하지 않는다면 검증 실패
            return false;
            // throw new CulturelandError("PinValidationError", "핀번호 형식이 올바르지 않습니다.");
        } else if (parts[0].match(/^31[1-9]/) && parts[3].length === 4) { // 핀번호가 31로 시작하고 3번째 자리가 1~9이고, 마지막 핀번호 부분이 4자리라면
            // 검증 성공 (2024년 3월에 추가된 핀번호 형식)
            // /assets/js/egovframework/com/cland/was/util/ClandCmmUtl.js L1281
        } else if (["2", "3", "4", "5"].includes(parts[0].charAt(0))) { // 핀번호가 2, 3, 4, 5로 시작한다면 (문화상품권, 온라인문화상품권)
            if (parts[3].length !== 6) { // 마지막 핀번호 부분이 6자리가 아니라면 검증 실패
                return false;
                // throw new CulturelandError("PinValidationError", "마지막 핀 파트가 6자리가 아닙니다.");
            }
        } else { // 위 조건에 하나도 맞지 않는다면 검증 실패
            return false;
            // throw new CulturelandError("PinValidationError", "핀번호 형식이 올바르지 않습니다.");
        }

        return true;
    }
}

export default Pin;