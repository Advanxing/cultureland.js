import crypto from "crypto";
import Jimp from "jimp";
import Seed from "./Seed.js";
import mTranskey from "./Transkey.js";
import { ServletData } from "./types.js";

const specialChars = ["`", "~", "!", "@", "#", "$", "%", "^", "&", "*", "(", ")", "-", "_", "=", "+", "[", "{", "]", "}", "\\", "|", ";", ":", "/", "?", ",", "<", ".", ">", "'", "\"", "+", "-", "*", "/"];
const lowerChars = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "a", "s", "d", "f", "g", "h", "j", "k", "l", "z", "x", "c", "v", "b", "n", "m"];
const lowerKeyBlankHash = "997e5efa6dfa3cf8e0a1a27eeb30ed02";
const numberKeyHashes = [
    "a23da146c706191d54597b01b6813fee", // 0
    "47b35f315e80e955cbbc099926cdcb0c", // 1
    "00adba3a2cc9b45ebd3cc02e2e2886e1", // 2
    "325ccb0511e033e9faec110a84eea8ab", // 3
    "2e333c1384074a6c2f3c5b196d0cc23b", // 4
    "44a66459f3f9c922f01cda54705cc1d3", // 5
    "1c8a78237189cd67eaf896e5643e21d7", // 6
    "834d0bf6f5bfee4776f6db1f38eb7453", // 7
    "64e333a7f9b0aa9cf0310b7f721a6b4e", // 8
    "cb240797063e081c6a539b2b15b9c447", // 9
    "9c87ff1abc394dae90c07f2dec95bec5" // blank
];

export class Keypad {
    public keyIndex = "";
    public constructor(
        public mTranskey: mTranskey,
        public servletData: ServletData,
        public keyboardType: "qwerty" | "number",
        public name: string,
        public inputName: string,
        public fieldType: string
    ) { }

    /**
     * 비밀번호를 키패드 배열에 따라 암호화합니다.
     * @param pw 비밀번호
     * @param layout 키패드 배열
     * @returns 암호화된 비밀번호
     */
    public encryptPassword(pw: string, layout: number[]) {
        let encrypted = "";

        for (const val of pw.split("")) {
            const geo = this.servletData.keyInfo[this.keyboardType][
                layout.indexOf(
                    specialChars.includes(val) ? // val이 특수문자라면
                        specialChars.indexOf(val) : // 특수문자 키보드에서 val의 위치
                        this.keyboardType === "qwerty" ? // qwerty 키보드라면
                            lowerChars.indexOf(val.toLowerCase()) : // qwerty 키보드에서 val의 위치
                            parseInt(val) // 숫자 키보드에서 val의 위치
                )
            ];
            if (!geo) throw new Error("ERROR_GEO_NOT_FOUND"); // 키패드에 존재하지 않는 키

            let geoString = geo.join(" ");
            if (this.keyboardType === "qwerty") { // qwerty 키보드라면
                if (specialChars.includes(val)) geoString = "s " + geo.join(" "); // 특수문자라면
                else if (val === val.toUpperCase()) geoString = "u " + geo.join(" "); // 대문자라면
                else geoString = "l " + geo.join(" "); // 소문자 또는 숫자라면
            }

            encrypted += "$" + Seed.SeedEnc(geoString, this.mTranskey.sessionKey);
        }

        return {
            encrypted,
            encryptedHmac: crypto.createHmac("sha256", this.mTranskey.genSessionKey).update(encrypted).digest("hex")
        };
    }

    /**
     * 키패드 사진을 분석하여 키패드 배열을 가져옵니다.
     * @returns 키패드 배열
     */
    public async getKeypadLayout() {
        this.keyIndex = await this.mTranskey.client.post("https://m.cultureland.co.kr/transkeyServlet", new URLSearchParams({
            "op": "getKeyIndex",
            "name": this.name,
            "keyType": this.keyboardType === "qwerty" ? "lower" : "single",
            "keyboardType": `${this.keyboardType}Mobile`,
            "fieldType": this.fieldType,
            "inputName": this.inputName,
            "parentKeyboard": "false",
            "transkeyUuid": this.mTranskey.transkeyUuid,
            "exE2E": "false",
            "TK_requestToken": this.servletData.requestToken,
            "allocationIndex": this.mTranskey.allocationIndex.toString(),
            "keyIndex": this.keyIndex,
            "initTime": this.servletData.initTime,
            "talkBack": "true"
        })).then(res => res.text());

        const keyImageBuffer = await this.mTranskey.client.get("https://m.cultureland.co.kr/transkeyServlet?" + new URLSearchParams({
            "op": "getKey",
            "name": this.name,
            "keyType": this.keyboardType === "qwerty" ? "lower" : "single",
            "keyboardType": `${this.keyboardType}Mobile`,
            "fieldType": this.fieldType,
            "inputName": this.inputName,
            "parentKeyboard": "false",
            "transkeyUuid": this.mTranskey.transkeyUuid,
            "exE2E": "false",
            "TK_requestToken": this.servletData.requestToken,
            "allocationIndex": this.mTranskey.allocationIndex.toString(),
            "keyIndex": this.keyIndex,
            "initTime": this.servletData.initTime
        })).then(res => res.arrayBuffer());

        const keyImage = await Jimp.read(Buffer.from(keyImageBuffer));
        const keys: Jimp[] = [];

        for (let y = 0; y < (this.keyboardType === "qwerty" ? 4 : 3); y++) { // 키패드 세로 칸만큼 반복
            for (let x = 0; x < (this.keyboardType === "qwerty" ? 11 : 4); x++) { // 키패드 가로 칸만큼 반복
                if (
                    this.keyboardType === "qwerty" && // qwerty 키보드라면
                    (
                        (x === 0 && y === 3) || // shift
                        ((x === 9 || x === 10) && y === 3) // backspace
                    )
                ) continue; // 불필요한 키는 건너뛰기

                const img = keyImage.clone()
                    .crop(
                        this.keyboardType === "qwerty" ? x * 54 + 22 : x * 160 + 70, // x 좌표
                        this.keyboardType === "qwerty" ? y * 80 + 30 : y * 102 + 45, // y 좌표
                        this.keyboardType === "qwerty" ? 15 : 20, // 너비
                        this.keyboardType === "qwerty" ? 45 : 25 // 높이
                    ); // 키패드 칸의 중앙만 남게 사진을 잘라냄

                keys.push(img);
            }
        }

        const layout: number[] = [];
        let i = 0;
        for (const key of keys) {
            const keyPayload = await key.getBufferAsync(Jimp.MIME_BMP);
            const keyHash = crypto.createHash("md5").update(new Uint8Array(keyPayload)).digest("hex"); // 키 사진의 해시

            if (this.keyboardType === "qwerty") {
                if (keyHash === lowerKeyBlankHash) layout.push(-1); // 빈 칸
                else layout.push(i++);
            }
            else layout.push(numberKeyHashes.indexOf(keyHash)); // 사진의 해시를 이용해 어떤 키인지 찾아냄
        }

        return layout;
    }
}

export default Keypad;