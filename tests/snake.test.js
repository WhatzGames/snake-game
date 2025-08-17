'use strict';

import { StorageService } from '../src/snake.js';

/** Simple in-memory localStorage mock. */
class MockLocalStorage {
	constructor() { this.store = {}; }
	getItem(key) { return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null; }
	setItem(key, value) { this.store[key] = String(value); }
	clear() { this.store = {}; }
}

globalThis.localStorage = new MockLocalStorage();

function assertEquals(actual, expected) {
	if (actual !== expected) {
	throw new Error(`${actual} !== ${expected}`);
}
}

Deno.test('StorageService stores high score and controls', () => {
	const storage = new StorageService();

	storage.setHighScore(42);
	assertEquals(storage.getHighScore(), 42);

	const controls = {
	scheme: 'wasd',
	keys: {
		up: 'KeyW',
		left: 'KeyA',
		down: 'KeyS',
		right: 'KeyD',
		pause: 'KeyP',
		restart: 'KeyR',
		wrap: 'KeyT',
	},
};
	storage.setControls(controls);
	assertEquals(JSON.stringify(storage.getControls()), JSON.stringify(controls));
});
