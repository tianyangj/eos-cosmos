import * as util from 'util';
import * as Eos from 'eosjs';
import { MongoClient } from 'mongodb';

const eos = Eos({
    httpEndpoint: 'https://api.eosnewyork.io',
    chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906'
});

const sleep = util.promisify(setTimeout);
const RETRY = 100;

// 'mongodb://USER:PASSWORD@eosio-shard-00-00-xfxjs.mongodb.net:27017,eosio-shard-00-01-xfxjs.mongodb.net:27017,eosio-shard-00-02-xfxjs.mongodb.net:27017/eos?ssl=true&replicaSet=eosio-shard-0&authSource=admin&retryWrites=true'
// 'mongodb://USER:PASSWORD@159.65.110.227:27017/eos?authSource=admin'
const connectionString = 'mongodb://@159.65.110.227:27017/eos?authSource=admin';

async function tryGetBlock(blockNumber) {
    for (let i = 0; i <= RETRY; i++) {
        try {
            return await eos.getBlock(blockNumber);
        } catch (err) {
            if (RETRY === i) {
                throw err;
            }
            await sleep(i * 1000);
        }
    }
}

// create block and transactions
async function createBlock(blockNumber: number, db) {
    const { transactions: transactionsRaw, ...blockRaw } = await tryGetBlock(blockNumber);
    const blocksColl = db.collection('blocks');
    const transactionsColl = db.collection('transactions');
    const block = {
        ...blockRaw,
        _id: blockRaw.id,
        transactions_count: transactionsRaw.length
    };
    const transactions = transactionsRaw.map(transactionRaw => ({
        ...transactionRaw,
        _id: transactionRaw.trx.id,
        block_num: blockRaw.block_num
    }));
    let promises = [blocksColl.findOneAndUpdate({ _id: block._id }, { $set: block }, { upsert: true })];
    if (transactions.length) {
        const transactionsBulkOp = transactionsColl.initializeOrderedBulkOp();
        transactions.forEach(transaction => {
            transactionsBulkOp.find({ _id: transaction._id }).upsert().updateOne(transaction);
        });
        promises.push(transactionsBulkOp.execute());
    }
    return Promise.all(promises);
}

// main loop
async function main() {
    MongoClient.connect(connectionString, async (err, client) => {
        if (err) {
            console.error(err);
            client.close();
        }
        const db = client.db('eos');
        const start = process.argv[2] ? Number(process.argv[2]) : 1;
        const end = process.argv[3] ? Number(process.argv[3]) : 200;
        for (let i = start; i <= end; i++) {
            await createBlock(i, db);
            console.log(`Finished Block #${i} at ${new Date()}`);
        }
        client.close();
    });
}

main();

// let head_block_num = 1;
// setInterval(() => {
//     eos.getInfo({}).then(info => {
//         console.log(`HYDRATE RANGE [${head_block_num}, ${info.head_block_num}]`);
//         head_block_num = info.head_block_num;
//     });
// }, 5000);
