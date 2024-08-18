import { CulturelandErrorNames } from "./types";

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