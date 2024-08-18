import CookieJar from "./CookieJar";

/**
 * 내장 fetch 모듈을 요청 인스턴스화(axios.AxiosInstance)한 클래스입니다.
 */
export default class FetchClient {
    private _cookieJar: CookieJar;
    private _requestInit: RequestInit;
    constructor(cookieJar: CookieJar, requestInit?: RequestInit) {
        this._cookieJar = cookieJar;
        this._requestInit = requestInit ?? {};
    }

    get cookieJar() {
        return this._cookieJar;
    }

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

    async post(url: string, body?: URLSearchParams, requestInit?: RequestInit) {
        const response = await fetch(url, {
            ...this._requestInit,
            ...requestInit,
            headers: {
                ...this._requestInit.headers,
                ...(body ? { "content-type": "application/x-www-form-urlencoded" } : {}), // header for URLSearchParams
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