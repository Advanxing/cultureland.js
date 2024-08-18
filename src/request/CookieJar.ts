import { Cookie } from "../types";

/**
 * 쿠키를 관리합니다.
 */
export default class CookieJar {
    private _cookies: Cookie[];
    constructor(cookies: Cookie[] = []) {
        this._cookies = cookies;
    }

    get cookies() {
        return this._cookies;
    }

    get(key: string) {
        const cookie = this._cookies.find(cookie => cookie.key === key);

        return cookie ? cookie.value : null;
    }

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

    remove(key: string) {
        const index = this._cookies.findIndex(cookie => cookie.key === key);

        // key not found
        if (index === -1) return false;

        this._cookies.splice(index, 1);
        return true;
    }

    toString() {
        const cookies: string[] = [];
        for (const cookie of this._cookies) {
            const cookieString = encodeURIComponent(cookie.key) + "=" + encodeURIComponent(cookie.value);
            cookies.push(cookieString);
        }

        return cookies.join("; ");
    }

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