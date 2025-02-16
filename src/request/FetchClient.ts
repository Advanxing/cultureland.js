import CookieJar from "./CookieJar";

/**
 * 내장 fetch 모듈(undici)을 요청 인스턴스화한 클래스입니다.
 */
export class FetchClient {
    private _cookieJar: CookieJar;
    private _requestInit: RequestInit;
    /**
     * 내장 fetch 모듈을 요청 인스턴스화한 클래스입니다.
     * @param cookieJar 쿠키가 저장된 쿠키 저장소
     * @param requestInit 요청 옵션
     */
    constructor(cookieJar: CookieJar, requestInit: RequestInit = {}) {
        this._cookieJar = cookieJar;
        this._requestInit = requestInit;
    }

    /**
     * 쿠키가 저장된 쿠키 저장소입니다.
     */
    get cookieJar() {
        return this._cookieJar;
    }

    /**
     * 서버에 GET 요청합니다.
     * cookie 헤더가 자동으로 추가됩니다.
     * @param url 요청 URL
     * @param requestInit 요청 옵션
     * @returns 요청 리스폰스
     */
    async get(url: string, requestInit?: RequestInit) {
        const response = await fetch(url, {
            ...this._requestInit,
            ...requestInit,
            headers: {
                ...this._requestInit.headers,
                cookie: this._cookieJar.toString(), // header for cookies
                ...requestInit?.headers
            },
            method: "GET"
        });

        const cookies = response.headers.getSetCookie();
        this._cookieJar.add(cookies);

        return response;
    }

    /**
     * 서버에 POST 요청합니다.
     * cookie 헤더가 자동으로 추가됩니다.
     * body를 포함할 경우 content-type이 자동으로 설정됩니다.
     * @param url 요청 URL
     * @param body 요청 페이로드
     * @param requestInit 요청 옵션
     * @returns 요청 리스폰스
     */
    async post(url: string, body?: URLSearchParams, requestInit?: RequestInit) {
        const response = await fetch(url, {
            ...this._requestInit,
            ...requestInit,
            headers: {
                ...this._requestInit.headers,
                ...(body && { "content-type": "application/x-www-form-urlencoded" }), // header for URLSearchParams
                cookie: this._cookieJar.toString(), // header for cookies
                ...requestInit?.headers
            },
            body,
            method: "POST"
        });

        const cookies = response.headers.getSetCookie();
        this._cookieJar.add(cookies);

        return response;
    }
}

export default FetchClient;