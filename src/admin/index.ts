import * as util from 'util';
import * as Eos from 'eosjs';
import * as DocumentDB from 'documentdb';

const eos = Eos({
    httpEndpoint: 'https://api.eosnewyork.io',
    chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906'
});

const cosmos = new DocumentDB.DocumentClient('https://eos.documents.azure.com:443/', {
    masterKey: 'N4fAkUrn0H8r3Cjg4h0KZLIljZGCDg6rErpi9ZOqgWCTz8FHeIx3HoqEFXkVXVxXP3KcHlAst1xIHUtduzvPrw=='
});
const blocksCollsPath = `dbs/eosio/colls/blocks`;
const transactionsCollsPath = `dbs/eosio/colls/transactions`;

// promisify cosmos callbacks
cosmos.createDocumentPromise = util.promisify(cosmos.createDocument);
cosmos.upsertDocumentPromise = util.promisify(cosmos.upsertDocument);

// create block and transactions
async function createBlock(blockNumber: number) {
    const { transactions, ...block } = await eos.getBlock(blockNumber);
    const blockPromise = cosmos.upsertDocumentPromise(blocksCollsPath, {
        ...block,
        transactionsCount: transactions.length
    });
    const transactionPromises = transactions.map(transaction => {
        return cosmos.upsertDocumentPromise(transactionsCollsPath, {
            id: transaction.trx.id,
            ...transaction
        });
    });
    return Promise.all([blockPromise, ...transactionPromises]);
}

// main loop
async function main() {
    for (let i = 100000; i <= 200000; i++) {
        await createBlock(i);
        console.log(`Finished Block #${i} at ${new Date()}`);
    }
}

main();

// eos.getBlock(5121619).then(blockData => {
//     const { transactions, ...block } = blockData;
//     const blockPromise = cosmos.upsertDocumentPromise(blocksCollsPath, block);
//     const transactionPromises = transactions.map(transaction => {
//         return cosmos.upsertDocumentPromise(transactionsCollsPath, {
//             id: transaction.trx.id,
//             ...transaction
//         });
//     });
//     return Promise.all([blockPromise, ...transactionPromises]);
// }).then(result => {
//     console.log(result);
// });
