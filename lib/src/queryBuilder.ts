'use strict';

interface obj{
  length: number,
  query : (string, any) => any,
  join : (any) => any,
  keys : any,
}

import { Pool } from 'pg';

const OPERATORS : string [] = ['>=', '<=', '<>', '>', '<'];

const where = (conditions : object, firstArgIndex = 1) : object => {
  const clause : string [] = [];
  const args : unknown[] = [];
  let i : number = firstArgIndex;
  const keys : string[] = Object.keys(conditions);
  for (const key of keys) {
    let operator : string = '=';
    let value : string = conditions[key];
    if (typeof value === 'string') {
      for (const op of OPERATORS) {
        const len : number = op.length;
        if (value.startsWith(op)) {
          operator = op;
          value = value.substring(len);
        }
      }
      if (value.includes('*') || value.includes('?')) {
        operator = 'LIKE';
        value = value.replace(/\*/g, '%').replace(/\?/g, '_');
      }
    }
    clause.push(`${key} ${operator} $${i++}`);
    args.push(value);
  }
  return { clause: clause.join(' AND '), args };
};

const updates = (delta : any, firstArgIndex : number = 1) : any => {
  const clause : string [] = [];
  const args : unknown[] = [];
  let i : number = firstArgIndex;
  const keys : any = Object.keys(delta);
  for (const key of keys) {
    const value = delta[key].toString();
    clause.push(`${key} = $${i++}`);
    args.push(value);
  }
  return { clause: clause.join(', '), args };
};



class Database {
    pool :any
    application : object
  constructor(config : any, application: object) {
    this.pool = new Pool(config);
    this.application = application;
  }

  query(sql : string, values : string[]) : any{
    const data : string = values ? values.join(',') : '';
    console.log(`${sql}\t[${data}]`);
    return this.pool.query(sql, values);
  }

  insert(table, record) : object{
    const keys : string[] = Object.keys(record);
    const nums : string []= new Array(keys.length);
    const data : any [] = new Array(keys.length);
    let i = 0;
    for (const key of keys) {
      data[i] = record[key];
      nums[i] = `$${++i}`;
    }
    const fields : string = keys.join(', ');
    const params : string = nums.join(', ');
    const sql : string = `INSERT INTO ${table} (${fields}) VALUES (${params})`;
    return this.query(sql, data);
  }

  async select(table, fields = ['*'], conditions = null) : Promise <any>{
    const keys : string = fields.join(', ');
    const sql : string  = `SELECT ${keys} FROM ${table}`;
    let whereClause : string = '';
    let args : string[]= [];
    if (conditions) {
      const whereData : any= where(conditions);
      whereClause  = ' WHERE ' + whereData.clause;
      args = whereData.args;
    }
    const res : any = await this.query(sql + whereClause, args);
    return res.rows;
  }

  delete(table, conditions = null) : any {
    const { clause, args } : any = where(conditions);
    const sql : string = `DELETE FROM ${table} WHERE ${clause}`;
    return this.query(sql, args);
  }

  update(table, delta = null, conditions = null) : any{
    const upd : any = updates(delta);
    const cond : any = where(conditions, upd.args.length + 1);
    const sql : string = `UPDATE ${table} SET ${upd.clause} WHERE ${cond.clause}`;
    const args : string[] = [...upd.args, ...cond.args];
    return this.query(sql, args);
  }

  close() {
    this.pool.end();
  }
}

module.exports = Database;
