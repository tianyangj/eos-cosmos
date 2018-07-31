import * as util from 'util';
import * as Eos from 'eosjs';

const eos = Eos({
    httpEndpoint: 'https://api.eosnewyork.io',
    chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906'
});

const sleep = util.promisify(setTimeout);
const RETRY = 100;

async function tryGetAccounts(latestAccountName = '') {
    for (let i = 0; i <= RETRY; i++) {
        try {
            return await eos.getTableRows({
                json: true,
                scope: "eosio",
                code: "eosio",
                table: "voters",
                table_key: "owner",
                lower_bound: latestAccountName,
                limit: 1000
            });
        } catch (err) {
            if (RETRY === i) {
                throw err;
            }
            await sleep(i * 1000);
        }
    }
}

// main loop
async function main() {
    let accounts = [];
    let result;
    do {
        result = await tryGetAccounts(accounts.length ? accounts[accounts.length - 1] : '');
        console.log(`Downloaded ${accounts.length} accounts...`);
        let temp: string[] = result.rows.map(row => row.owner);
        if (accounts.length) {
            temp.shift();
        }
        accounts = accounts.concat(temp);
    } while (result.more);
    console.log(accounts.length, accounts[accounts.length - 1])
}

// 204361
// 204364, zzzzzzzzzzzy

main();
