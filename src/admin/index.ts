import * as Eos from 'eosjs';
import * as DocumentDB from 'documentdb';

const eos = Eos({
    httpEndpoint: 'https://api.eosnewyork.io',
    chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906'
});

const cosmos = new DocumentDB.DocumentClient('https://eos.documents.azure.com:443/', {
    masterKey: 'N4fAkUrn0H8r3Cjg4h0KZLIljZGCDg6rErpi9ZOqgWCTz8FHeIx3HoqEFXkVXVxXP3KcHlAst1xIHUtduzvPrw=='
});
const dbUrl = `dbs/eosio`;
const collectionUrl = `${dbUrl}/colls/items`;
const blocksCollection = `${dbUrl}/colls/blocks`;
const transactionsCollection = `${dbUrl}/colls/transactions`;
const actionsCollection = `${dbUrl}/colls/actions`;

eos.getBlock(5121619).then(data => {
    const { transactions, ...block } = data;
    return new Promise((resolve, reject) => {
        cosmos.createDocument(blocksCollection, block, (err, created) => {
            if (err) {
                console.log(err)
                reject(err);
            } else {
                resolve(transactions);
            }
        });
    });
    // cosmos.createDocument(blocksCollection, block, (err, created) => {
    //     console.log('createDocument', created);
    // });
    // console.log(transactions)
    // console.log(transactions[0].trx.transaction)

    // if (data.transactions && data.transactions.length) {
    //     const transactions = data.transactions;
    //     delete data.transactions;
    // }5121619
    // cosmos.createDocument(blocksCollection, block, (err, created) => {

    //     console.log('createDocument', created);
    // });
}).then(transactions => {
    console.log(transactions)
    const tt = transactions.map(transaction => {
        return {
            id: transaction.trx.id,
            ...transaction
        };
    });
    console.log(tt);
});

// cosmos.readDocuments(collectionUrl).toArray((err, results) => {
//     console.log('results', results)
// });
