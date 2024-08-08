import crypto from "crypto";
import Jimp from "jimp";
import Seed from "./Seed.js";
import mTransKey from "./Transkey.js";
import { ServletData } from "./types.js";

const specialChars = ["`", "~", "!", "@", "#", "$", "%", "^", "&", "*", "(", ")", "-", "_", "=", "+", "[", "{", "]", "}", "\\", "|", ";", ":", "/", "?", ",", "<", ".", ">", "'", "\"", "+", "-", "*", "/"];
const lowerChars = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "a", "s", "d", "f", "g", "h", "j", "k", "l", "z", "x", "c", "v", "b", "n", "m"];
const numberKeyHashes = [
    "84f2eb127557f50338745a1efd1fabff", // 0
    "514e7f310783341192e91c2c51a52b84", // 1
    "79bfa52825b615af6ddb030feb2a8c41", // 2
    "d5f695d8e5b1b03f5e3f772585e601fe", // 3
    "66852070450c975e4e99192e9dc7ea8d", // 4
    "13901eb0b5a9fc5ff09e85075c29a324", // 5
    "cca1b470d8592bb1393922ca8e96792f", // 6
    "26b2dda3652b522653cc1f818de3cdac", // 7
    "915c6ece9e55c1e68b34acfc2ee0f69b", // 8
    "88d105f5dc94ee594d3d8d94da55fbc8", // 9
    "72b37a3cde7c13926b2404f47a19da5e" // empty
];

export class Keypad {
    public keyIndex = "";
    public constructor(
        public mTranskey: mTransKey,
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
        })).then(res => res.data);

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
        }), {
            responseType: "arraybuffer"
        }).then(res => Buffer.from(res.data, "binary"));

        const keyImage = await Jimp.read(keyImageBuffer);
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
            const keyPayload = await key.getBase64Async(Jimp.MIME_PNG);
            const keyHash = crypto.createHash("md5").update(keyPayload).digest("hex"); // 키 사진의 해시

            if (this.keyboardType === "qwerty") {
                if (keyHash === "44529f2104900879d858baf3f763b3b2") layout.push(-1); // 빈 칸
                else layout.push(i++);
            }
            else layout.push(numberKeyHashes.indexOf(keyHash)); // 사진의 해시를 이용해 어떤 키인지 찾아냄
        }

        return layout;
    }
}

export default Keypad;