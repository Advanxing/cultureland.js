/**
 * 핀번호를 관리하는 클래스입니다.
 * 핀번호 포맷팅에 사용됩니다.
 */
export class Pin {
    private _parts: [string, string, string, string] | null;

    /**
     * 핀번호를 자동으로 포맷팅합니다.
     * 핀번호가 유효하지 않은 경우 parts가 null을 반환합니다.
     * @param pin 상품권의 핀번호
     */
    public constructor(pin: string) {
        this._parts = Pin.format(pin) || null;
    }

    /**
     * 핀번호의 유효성을 검증합니다.
     * 존재할 수 없는 핀번호를 검사하여 불필요한 요청을 사전에 방지합니다.
     * @param pin 상품권의 핀번호
     * @returns `false` - 핀번호가 유효하지 않음
     * @returns `string[]` - 핀번호를 4자리씩 끊은 배열 | `["3110", "0123", "4567", "8901"]`
     */
    public static format(pin: string): [string, string, string, string] | false {
        const pinMatches = pin.match(/(\d{4})\D*(\d{4})\D*(\d{4})\D*(\d{6}|\d{4})/);
        if (!pinMatches) { // 핀번호 regex에 맞지 않는다면 검증 실패
            return false;
        }

        const parts: [string, string, string, string] = [pinMatches[1], pinMatches[2], pinMatches[3], pinMatches[4]];
        if (parts[0].startsWith("416") || parts[0].startsWith("4180")) { // 핀번호가 416(컬쳐랜드상품권 구권) 또는 4180(컬쳐랜드상품권 신권)으로 시작한다면
            if (parts[3].length !== 4) { // 마지막 핀번호 부분이 4자리가 아니라면 검증 실패
                return false;
            }
        } else if (parts[0].startsWith("41")) { // 핀번호가 41로 시작하지만 416 또는 4180으로 시작하지 않는다면 검증 실패
            return false;
        } else if (parts[0].match(/^31[1-9]/) && parts[3].length === 4) { // 핀번호가 31로 시작하고 3번째 자리가 1~9이고, 마지막 핀번호 부분이 4자리라면
            // 검증 성공 (2024년 3월에 추가된 핀번호 형식)
            // /assets/js/egovframework/com/cland/was/util/ClandCmmUtl.js L1281
        } else if (["2", "3", "4", "5"].includes(parts[0].charAt(0))) { // 핀번호가 2, 3, 4, 5로 시작한다면 (문화상품권, 온라인문화상품권)
            if (parts[3].length !== 6) { // 마지막 핀번호 부분이 6자리가 아니라면 검증 실패
                return false;
            }
        } else { // 위 조건에 하나도 맞지 않는다면 검증 실패
            return false;
        }

        // 검증 성공
        return parts;
    }

    /**
     * 포맷팅이 완료된 핀번호입니다.
     * 유효하지 않은 핀번호가 입력되었을 경우 null을 반환합니다.
     * @example
     * ["3110", "0123", "4567", "8901"]
     */
    public get parts(): [string, string, string, string] | null {
        return this._parts;
    }

    /**
     * 핀번호를 string으로 반환합니다.
     * @example
     * "3110-0123-4567-8901"
     */
    public toString(): string {
        return this.parts?.join("-") || "null";
    }
}

export default Pin;