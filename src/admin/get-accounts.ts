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

async function getActions(db, skip = 0, limit = 100) {
    const transactionsColl = db.collection('transactions');
    // find transactions that has at least one action related to newaccount
    const transactions = await transactionsColl.find({
        'trx.transaction.actions': { $elemMatch: { account: 'eosio', name: 'newaccount' } },
        //'trx.transaction.actions.name': 'newaccount'
    }).skip(skip).limit(limit).toArray();
    console.log('TX', transactions.length, transactions[transactions.length - 1]._id);
    const actions = transactions.reduce((acc, cur, index) => {
        if (index === 50) {
            console.log(cur)
        }

        return acc.concat(cur.trx.transaction.actions);
    }, []).filter(action => {
        return action.account === 'eosio' && action.name === 'newaccount';
    }).map((action, index) => {
        if (index === 1000) {
            console.log(action)
        }
        return {
            creator: action.data.creator,
            name: action.data.name
        };
    });
    return actions;
}

// main loop
async function main() {
    MongoClient.connect(connectionString, async (err, client) => {
        if (err) {
            console.error(err);
            client.close();
        }
        const db = client.db('eos');
        let total = 0;
        for (let i = 0; i < 1; i++) {
            const actions = await getActions(db, i * 100, 100);
            total += actions.length;
            console.log(`Transaction [${i * 100}, ${i * 100 + 100}], Subtotal: ${actions.length}, Name: ${actions[actions.length - 1].name} Total: ${total}`);
        }
        client.close();
    });
}

main();