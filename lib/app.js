'use strict';

const libs = require('./libs.js');
const { crypto, path, events, vm, fs, fsp, url } = libs;
const Crypto = require('./crypto.js');
const Config = require('./config.js');
const Server = require('./server.js');
const Sessions = require('./sessions.js');
const Database = require('./dist/queryBuilder.js');

const PATH = process.cwd();
const API_PATH = path.join(PATH, 'api');
const STATIC_PATH = path.join(PATH, 'static');
const STATIC_PATH_LENGTH = STATIC_PATH.length;
const SCRIPT_OPTIONS = { timeout: 5000 };

class App extends events.EventEmitter {
  constructor() {
    super();
    this.closed = false;
    this.namespaces = ['db'];
    this.api = new Map();
    this.cache = new Map();
    this.path = PATH;
    this.cacheDirectory(STATIC_PATH);
    this.cacheMethods();
  }

  async shutdown() {
    this.closed = true;
  }

  createSandbox() {
    const keys = async () => [...this.api.keys()];
    const context = Object.freeze({});
    const app = { Crypto, api: { keys }, context };
    for (const name of this.namespaces) app[name] = this[name];
    const sandbox = {
      module: {},
       app, Buffer, libs
    };
    sandbox.global = sandbox;
    return vm.createContext(sandbox);
  }

  sandboxInject(namespaces) {
    const names = Object.keys(namespaces);
    for (const name of names) this[name] = Object.freeze(namespaces[name]);
    this.namespaces.push(...names);
  }

  async createScript(fileName) {
    const code = await fsp.readFile(fileName, 'utf8');
    const src = `'use strict';\ncontext => ${code}`;
    const options = { filename: fileName, lineOffset: -1 };
    try {
      return new vm.Script(src, options);
    } catch (err) {
      console.log(err.stack);
      return null;
    }
  }

  runScript(methodName, sandbox = this.sandbox) {
    const script = this.api.get(methodName);
    if (!script) throw new Error('Not found');
    return script.runInContext(sandbox, SCRIPT_OPTIONS);
  }

  async cacheFile(filePath) {
    const key = filePath.substring(STATIC_PATH_LENGTH);
    try {
      const data = await fsp.readFile(filePath);
      this.cache.set(key, data);
    } catch (err) {
      console.log(err.stack);
      if (err.code !== 'ENOENT') throw err;
    }
  }

  async cacheDirectory(directoryPath) {
    const files = await fsp.readdir(directoryPath, { withFileTypes: true });
    for (const file of files) {
      const filePath = path.join(directoryPath, file.name);
      if (file.isDirectory()) await this.cacheDirectory(filePath);
      else await this.cacheFile(filePath);
    }
    fs.watch(directoryPath, (event, fileName) => {
      const filePath = path.join(directoryPath, fileName);
      this.cacheFile(filePath);
    });
  }

  async cacheMethod(fileName) {
    const { name, ext } = path.parse(fileName);
    if (ext !== '.js' || name.startsWith('.')) return;
    const script = await this.createScript(fileName);
    if (script) this.api.set(name, script);
    else this.api.delete(name);
  }

  async cacheMethods() {
    const files = await fsp.readdir(API_PATH);
    for (const fileName of files) {
      const filePath = path.join(API_PATH, fileName);
      await this.cacheMethod(filePath);
    }
    fs.watch(API_PATH, (event, fileName) => {
      const filePath = path.join(API_PATH, fileName);
      this.cacheMethod(filePath);
    });
  }
}

module.exports = App;
