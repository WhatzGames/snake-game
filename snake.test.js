const assert = require('assert');
const { StorageService, Config } = require('./snake.js');

// Simple in-memory localStorage mock
class MockLocalStorage {
  constructor() { this.store = {}; }
  getItem(k) { return Object.prototype.hasOwnProperty.call(this.store,k) ? this.store[k] : null; }
  setItem(k,v) { this.store[k] = String(v); }
  clear() { this.store = {}; }
}

// attach mock
global.localStorage = new MockLocalStorage();

const storage = new StorageService();

// test high score storage
storage.setHighScore(42);
assert.strictEqual(storage.getHighScore(), 42);

// test controls storage
const controls = { scheme: 'wasd', keys: {up:'KeyW', left:'KeyA', down:'KeyS', right:'KeyD'} };
storage.setControls(controls);
assert.deepStrictEqual(storage.getControls(), controls);

console.log('All tests passed');
