import crypto from "crypto";

/**
 * 컬쳐랜드 mTranskey RSA 퍼블릭 키
 * @description https://m.cultureland.co.kr/transkeyServlet?op=getPublicKey
 * 에서 구할 수 있습니다.
 */
export const CULTURELAND_PUBLICKEY = "MIIDhTCCAm2gAwIBAgIJAO4t+//wr+lZMA0GCSqGSIb3DQEBCwUAMGcxCzAJBgNVBAYTAktSMR0wGwYDVQQKExRSYW9uU2VjdXJlIENvLiwgTHRkLjEaMBgGA1UECxMRUXVhbGl0eSBBc3N1cmFuY2UxHTAbBgNVBAMTFFJhb25TZWN1cmUgQ28uLCBMdGQuMB4XDTIyMTAyNzAyMDI1NFoXDTQyMTAyMjAyMDI1NFowgYAxCzAJBgNVBAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBXaWRnaXRzIFB0eSBMdGQxOTA3BgNVBAMMMFQ9UCZEPTE5NzQ4NjQ2Q0Y3NTE0NENEMzc2RUM2RkI0RkUwMDQ5MEQ5NEYyNjQmaDCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAM4mPj/ZWCZNpRQWvjmOQtiT34VoUeVjWDd/pClqzLFpW3ckU7b7nfUwYzc5ZI21vc7Fb5tDWNlmNa9kapbC/9q/yWMZB0qpmslElAcSJexD9M4eA9ydC2309WxdLCsudDw4NlcN5kqs6C2cNZd1aDkP4ZamfdGbWjDsZqjQQFqdFg7HrYHzPn5m5dpCk4qmrYyLdDzA+HtKSVT7wceDAwRuUDz7tDDDeidQOm/5rkA/UeMRsH1PAF6SV0XqP5xsKtADPkHtl/0k4ikt4zNkM9kvwcIv/tcmRcRDpnmsUsZMEBxnvbo4mjJ239FTmvnquM75bPVlvrtojafWCCI5CksCAwEAAaMaMBgwCQYDVR0TBAIwADALBgNVHQ8EBAMCBeAwDQYJKoZIhvcNAQELBQADggEBABXyYfzQK63C5m16/SXxX2BKeUdVXxnEEyI/9dfReDEsj8yzVQipDSK8FiH05JtLqRpDKnfezXEDCYNMqIs3eRxBG2aO+ZCPaqSFllio2igSz3ENt7PbneX1qV8lTqnVg5/8qRteztSynKkECfbyV0VJBPw2gpeE1EheMXOAPu1zvdCYd29pgNlW3vPPDIXHUEZvlOCV8WhTfeE4jjOyVfLsVYSmnqIYc1ptdCPILwf0cp0s8feOAgeUN1VJ1TvoEXw4CZz7MSqruPUzt6MqoX7ShkGnq4ZDMRkVnInsKo2fzW+QNPrOzwO/yOsB/0bY+iQHLSpNYF3YRllCiE8L8XU=";

export function rsaEncrypt(text: string, publicKey: string) {
    const cert = buildCertificate(publicKey);

    const encrypted = crypto.publicEncrypt(
        new crypto.X509Certificate(cert).publicKey,
        Buffer.from(text)
    );

    return encrypted.toString("hex").slice(0, 512); // 처음 512글자만 사용
}

export function buildCertificate(cert: string) {
    cert = cert.replace("-----BEGIN CERTIFICATE-----", ""); // Prefix 제거
    cert = cert.replace("-----END CERTIFICATE-----", ""); // Suffix 제거
    cert = cert.replace(/(.{64})/g, "$1\n"); // 64글자마다 줄바꿈

    return "-----BEGIN CERTIFICATE-----\n" + cert + "\n-----END CERTIFICATE-----";
}