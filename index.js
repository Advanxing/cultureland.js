const cultureland = require("./cultureland");

(async function() {
    const client = new cultureland();
    await client.login("keepLoginInfo").then(console.log).catch(console.error);
    await client.charge("0000-0000-0000-000000", false).then(console.log).catch(console.error);
})();