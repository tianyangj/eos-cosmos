import * as Eos from 'eosjs';
import { MongoClient } from 'mongodb';

const eos = Eos({
    httpEndpoint: 'https://api.eosnewyork.io',
    chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906'
});

// 'mongodb://<USER>:<PASSWORD>@eosio-shard-00-00-xfxjs.mongodb.net:27017,eosio-shard-00-01-xfxjs.mongodb.net:27017,eosio-shard-00-02-xfxjs.mongodb.net:27017/eos?ssl=true&replicaSet=eosio-shard-0&authSource=admin&retryWrites=true'
const connectionString = 'mongodb://@eosio-shard-00-00-xfxjs.mongodb.net:27017,eosio-shard-00-01-xfxjs.mongodb.net:27017,eosio-shard-00-02-xfxjs.mongodb.net:27017/eos?ssl=true&replicaSet=eosio-shard-0&authSource=admin&retryWrites=true';

// create block and transactions
async function createBlock(blockNumber: number, db) {
    const { transactions: transactionsRaw, ...blockRaw } = await eos.getBlock(blockNumber);
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
        for (let i = 1; i <= 200; i++) {
            await createBlock(i, db);
            console.log(`Finished Block #${i} at ${new Date()}`);
        }
        client.close();
    });
}

main();
