import { Cookie } from "../types";

/**
 * 쿠키를 관리하는 쿠키 저장소입니다.
 */
export class CookieJar {
    private _cookies: Cookie[];
    /**
     * 쿠키가 저장되는 쿠키 저장소입니다.
     * @param cookies 쿠키
     */
    constructor(cookies: Cookie[] = []) {
        this._cookies = cookies;
    }

    /**
     * 저장된 쿠키를 반환합니다.
     */
    get cookies() {
        return this._cookies;
    }

    /**
     * 쿠키를 가져옵니다.
     * @example
     * cookieJar.get("KeepLoginConfig");
     * @param key 가져올 쿠키의 키 (이름)
     * @returns 쿠키의 값
     */
    get(key: string) {
        const cookie = this._cookies.find(cookie => cookie.key === key);

        return cookie ? cookie.value : null;
    }

    /**
     * 쿠키를 추가합니다.
     * @example
     * cookieJar.add({ key: "KeepLoginConfig", value: "keepLoginInfo" });
     * @param cookie 추가할 쿠키
     */
    add(cookie: string): void;
    add(cookie: string[]): void;
    add(cookie: Cookie): void;
    add(cookies: Cookie[]): void;
    add(cookies: string | string[] | Cookie | Cookie[]): void {
        // Array-ify
        if (typeof cookies === "string") { // string
            const cookie = CookieJar.parse(cookies);
            if (cookie === null) return;
            cookies = [ cookie ];
        } else if (!Array.isArray(cookies)) { // Cookie
            cookies = [ cookies ];
        } else if (cookies.every(cookie => typeof cookie === "string")) { // string[]
            cookies = CookieJar.parse(cookies);
        }

        const reversed = cookies.slice().reverse(); // to get the last index
        // take the last one if there are 2 or more cookies with the same key
        cookies = cookies.filter(
            (cookie, i, cookies) => // why do i need cookies here again? wtf typescript
                i === (cookies.length - 1) - reversed.findIndex(c => c.key === cookie.key)
                // basically findLastIndex polyfill, idk if this code is efficient
        );

        // remove old keys (to replace with new ones)
        for (const cookie of cookies) {
            this.remove(cookie.key);
        }

        this._cookies.push(...cookies);
    }

    /**
     * 저장된 쿠키를 설정합니다. (저장된 모든 쿠키를 덮어씁니다)
     * @example
     * cookieJar.set({ key: "KeepLoginConfig", value: "keepLoginInfo" });
     * @param cookie 저장할 쿠키
     */
    set(cookie: string): void;
    set(cookie: string[]): void;
    set(cookie: Cookie): void;
    set(cookies: Cookie[]): void;
    set(cookies: string | string[] | Cookie | Cookie[]): void {
        if (typeof cookies === "string") { // string
            const cookie = CookieJar.parse(cookies);
            if (cookie === null) {
                this._cookies = [];
            } else {
                this._cookies = [ cookie ];
            }
        } else if (!Array.isArray(cookies)) { // Cookie
            this._cookies = [ cookies ];
        } else if (cookies.every(cookie => typeof cookie === "string")) { // string[]
            this._cookies = CookieJar.parse(cookies);
        } else { // Cookie[]
            this._cookies = cookies;
        }
    }

    /**
     * 쿠키를 삭제합니다.
     * @param key 삭제할 쿠키의 키 (이름)
     * @returns 삭제 성공 여부
     */
    remove(key: string) {
        const index = this._cookies.findIndex(cookie => cookie.key === key);

        // key not found
        if (index === -1) return false;

        this._cookies.splice(index, 1);
        return true;
    }

    /**
     * 저장된 쿠키를 cookie 헤더 형식에 맞춰 string으로 변환합니다.
     */
    toString() {
        const cookies: string[] = [];
        for (const cookie of this._cookies) {
            const cookieString = encodeURIComponent(cookie.key) + "=" + encodeURIComponent(cookie.value).replace(/%20/g, "+");
            cookies.push(cookieString);
        }

        return cookies.join("; ");
    }

    /**
     * set-cookie 헤더에서 쿠키를 파싱합니다.
     * @example
     * cookieJar.parse("KeepLoginConfig=keepLoginInfo; …");
     * @param cookie set-cookie 헤더 값
     */
    static parse(cookie: string): Cookie | null;
    static parse(cookies: string[]): Cookie[];
    static parse(cookies: string | string[]): Cookie | Cookie[] | null {
        if (Array.isArray(cookies)) {
            const parsedCookies: Cookie[] = [];
            for (const cookie of cookies) {
                const parsed = this.parse(cookie);
                if (parsed !== null) parsedCookies.push(parsed);
            }
            return parsedCookies;
        }

        const parsed = cookies.split(";")[0].split("=").map(decodeURIComponent);
        // not a proper set-cookie value
        if (parsed.length < 2) return null;

        return {
            key: parsed.shift()!,
            value: parsed.join("=")
        };
    }
}

export default CookieJar;