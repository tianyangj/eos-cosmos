import { Injectable } from '@nestjs/common';
import * as util from 'util';
import * as DocumentDB from 'documentdb';

// https://docs.microsoft.com/en-us/azure/cosmos-db/sql-api-sql-query#parameterized-sql-queries
// https://docs.microsoft.com/en-us/rest/api/cosmos-db/
// https://eos.documents.azure.com/dbs/eosio/colls/blocks/docs

function isNumeric(num) {
  return !isNaN(num);
}

const cosmos = new DocumentDB.DocumentClient('https://eos.documents.azure.com:443/', {
  masterKey: 'aEsWOq4h24snf4RuvUGCLZCAbSvE5d4mR0JxgeauT1Bnd4207ITyqettdt3Ie30mkkAqThKlcivYq4kHpncT4A=='
});
const blocksCollsPath = `dbs/eosio/colls/blocks`;
const transactionsCollsPath = `dbs/eosio/colls/transactions`;

@Injectable()
export class AppService {
  root(): string {
    return 'Hello World!';
  }

  getBlock(id: string): Promise<any> {
    const query = isNumeric(id) ? `SELECT * FROM b WHERE b.block_num = ${id}` : `SELECT * FROM b WHERE b.id = "${id}"`;
    return new Promise((resolve, reject) => {
      cosmos.queryDocuments(
        blocksCollsPath,
        query
      ).toArray((err, results) => {
        if (err) {
          reject(err);
        } else {
          if (results && results.length) {
            resolve(results[0]);
          } else {
            reject(404);
          }
        }
      });
    });
  }

  getBlocks(limit = 10): Promise<any[]> {
    return new Promise((resolve, reject) => {
      cosmos.queryDocuments(
        blocksCollsPath,
        `SELECT TOP ${limit} * FROM b ORDER BY b.block_num DESC`
      ).toArray((err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      });
    });
  }
}
