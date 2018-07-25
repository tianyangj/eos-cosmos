import * as Eos from 'eosjs';
import { MongoClient } from 'mongodb';

const eos = Eos({
    httpEndpoint: 'https://api.eosnewyork.io',
    chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906'
});

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
    let promises = [blocksColl.insertOne(block)];
    if (transactions.length) {
        promises.push(transactionsColl.insertMany(transactions));
    }
    return Promise.all(promises);
}

// main loop
async function main() {
    MongoClient.connect('mongodb://localhost:27017', async (err, client) => {
        const db = client.db('eos');
        for (let i = 1; i <= 200; i++) {
            await createBlock(i, db);
            console.log(`Finished Block #${i} at ${new Date()}`);
        }
    });
}

main();
