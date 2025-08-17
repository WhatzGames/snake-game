'use strict';

// Entry script for Snake — Dark Mode (Canvas)

export class Config {
	static GRID = 24;
	static BASE_CPS = 6;
	static MAX_CPS = 16;
	static MIN_CPS = 3;
	static CPS_INC = 0.5;

	static MAX_HP = 3;
	static BANANA_SLOW = 2;
	static BANANA_BASE_MS = 3000;
	static BANANA_PER_HS_MS = 150;
	static BANANA_MAX_MS = 10000;

	static BASE_MOUSE_CPS = 4;
	static MIN_MOUSE_CPS = 2;
	static MAX_MOUSE_CPS = 14;

	// Mouse AI configuration
	static MOUSE_ALERT_DIST = 3; // cells (Chebyshev distance) at or below which the mouse panics

	static HS_KEY = 'snake_highscore_v1';
	static CONTROLS_KEY = 'snake_controls_v1';
}

export class StorageService {
	getHighScore() {
		try {
			return +localStorage.getItem(Config.HS_KEY) || 0;
		} catch {
			return 0;
		}
	}
	setHighScore(value) {
		try {
			localStorage.setItem(Config.HS_KEY, String(value));
		} catch { /* empty */ }
	}
	getControls() {
		try {
			const raw = localStorage.getItem(Config.CONTROLS_KEY);
			return raw ? JSON.parse(raw) : null;
		} catch {
			return null;
		}
	}
	setControls(value) {
		try {
			localStorage.setItem(Config.CONTROLS_KEY, JSON.stringify(value));
		} catch { /* empty */ }
	}
}

class ErrorOverlayService {
	#overlayManager;
	#errorCaptured = false;
	constructor(overlayManager) {
		this.#overlayManager = overlayManager;
	}
	installGlobalHandlers() {
		window.addEventListener('error', (e) => {
			this.handle(e && (e.error || e.message || e));
		});
		window.addEventListener('unhandledrejection', (e) => {
			this.handle(e && (e.reason || e));
		});
	}
	handle(err) {
		let message = '';
		try {
			message = (err && (err.message || err.stack || err + '')) + '';
		} catch {
			message = String(err);
		}
		if (/ResizeObserver/i.test(message)) return;
		if (this.#errorCaptured) return;
		this.#errorCaptured = true;
		this.#overlayManager.showError(message || 'Error');
		try {
			console.error(err);
		} catch { /* empty */ }
	}
	isCaptured() {
		return this.#errorCaptured;
	}
}

class HUDService {
	#scoreEl;
	#highEl;
	#speedEl;
	#hpEl;
	#slowEl;
	constructor() {
		this.#scoreEl = document.getElementById('score');
		this.#highEl = document.getElementById('high');
		this.#speedEl = document.getElementById('speed');
		this.#hpEl = document.getElementById('hp');
		this.#slowEl = document.getElementById('slow');
	}
	setScore(value) {
		if (this.#scoreEl) this.#scoreEl.textContent = String(value);
	}
	setHighScore(value) {
		if (this.#highEl) this.#highEl.textContent = String(value);
	}
	setHP(value) {
		if (this.#hpEl) this.#hpEl.textContent = String(value);
	}
	setSpeedText(text) {
		if (this.#speedEl) this.#speedEl.textContent = text;
	}
	setSlowText(text) {
		if (this.#slowEl) this.#slowEl.textContent = text;
	}
}

class DpiScalerService {
	#canvas;
	#ctx;
	#boardSize = 0;
	#onResize;
	#resizeRaf = 0;
	constructor(canvas, onResize) {
		this.#canvas = canvas;
		this.#ctx = canvas.getContext('2d');
		this.#onResize = onResize;
	}
	getBoardSize() {
		return this.#boardSize;
	}
	getCtx() {
		return this.#ctx;
	}
	getCellSize() {
		return this.#boardSize / Config.GRID;
	}
	scheduleFix() {
		if (this.#resizeRaf) return;
		this.#resizeRaf = requestAnimationFrame(() => {
			this.#resizeRaf = 0;
			this.fixDPI();
		});
	}
	install() {
		if ('ResizeObserver' in window) {
			new ResizeObserver(() => {
				this.scheduleFix();
			}).observe(this.#canvas.parentElement);
		} else {
			window.addEventListener('resize', () => this.scheduleFix());
		}
		window.addEventListener('resize', () => this.scheduleFix());
		this.scheduleFix();
	}
	fixDPI() {
		const dpr = window.devicePixelRatio || 1;
		const canvas = this.#canvas;
		const ctx = this.#ctx;
		const shell = document.querySelector('.shell');
		const card = document.querySelector('.card');
		const header = document.querySelector('header');
		const footer = document.querySelector('footer');
		const touch = document.querySelector('.touchpad');
		const legend = document.querySelector('.legend');
		const cardStyles = getComputedStyle(card);
		const shellStyles = getComputedStyle(shell);
		const padTop = parseFloat(cardStyles.paddingTop) || 0;
		const padBottom = parseFloat(cardStyles.paddingBottom) || 0;
		const borderTop = parseFloat(cardStyles.borderTopWidth) || 0;
		const borderBottom = parseFloat(cardStyles.borderBottomWidth) || 0;
		const shellMT = parseFloat(shellStyles.marginTop) || 0;
		const shellMB = parseFloat(shellStyles.marginBottom) || 0;
		const headH = header ? header.offsetHeight || 0 : 0;
		const footH = footer ? footer.offsetHeight || 0 : 0;
		const touchH = touch && getComputedStyle(touch).display !== 'none'
			? (touch.offsetHeight || 0)
			: 0;
		// Subtract legend height only on narrow/mobile layout where it stacks above the board
		const isMobile = window.innerWidth <= 780;
		const legendH = (isMobile && legend && getComputedStyle(legend).display !== 'none')
			? (legend.offsetHeight || 0)
			: 0;
		const chrome = shellMT + shellMB + padTop + padBottom + borderTop + borderBottom + headH +
			footH + touchH + legendH;
		const availH = Math.max(0, Math.floor(window.innerHeight - chrome - 8));
		const availW = Math.floor(canvas.parentElement.clientWidth || 0);
		const size = Math.max(140, Math.min(availW, availH));
		const dprW = Math.round(size * dpr);
		const dprH = Math.round(size * dpr);
		if (
			canvas.width === dprW && canvas.height === dprH && canvas.style.width === size + 'px' &&
			canvas.style.height === size + 'px' && this.#boardSize === size
		) {
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			return;
		}
		this.#boardSize = size;
		canvas.style.width = size + 'px';
		canvas.style.height = size + 'px';
		if (canvas.width !== dprW) canvas.width = dprW;
		if (canvas.height !== dprH) canvas.height = dprH;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		if (typeof this.#onResize === 'function') this.#onResize(this.#boardSize);
	}
}

class OverlayManager {
	#game;
	#legendOpen = false;
	#legendWasPlaying = false;
	constructor(game) {
		this.#game = game;
	}
	addOverlay(html, id, interactive = true) {
		const wrap = document.body; // attach at top-level to ensure top-most rendering
		const overlay = document.createElement('div');
		overlay.className = 'overlay' + (interactive ? ' interactive' : '');
		if (id) overlay.id = id;
		overlay.innerHTML = `<div class=\"panel\">${html}</div>`;
		wrap.appendChild(overlay);
		return overlay;
	}
	removeOverlays() {
		document.querySelectorAll('.overlay').forEach((n) => n.remove());
		this.#legendOpen = false;
	}
	startOverlay(wrapWalls, onPlay, onToggleWrap) {
		const html = `
      <div class=\"title\">Snake — Dark Mode</div>
      <div class=\"subtitle\">Use the keyboard to move. Eat apples. Bananas slow time briefly, oranges add HP, pears teleport, cherries add +1 and enable a one-step wrap only when wrap is off.</div>
      <div class=\"btns\">
        <button class=\"primary\" id=\"playBtn\">Play</button>
        <button id=\"wrapBtn\">Wrap: ${wrapWalls ? 'On' : 'Off'}</button>
        ${
			this.#game.isTouch
				? ''
				: '<button class="info-btn" id="controlsBtn" aria-label="Controls">⌨</button>'
		}
        <button class=\"info-btn\" id=\"infoBtn\" aria-label=\"Info\">ⓘ</button>
      </div>`;
		const o = this.addOverlay(html, 'start', true);
		o.querySelector('#playBtn').addEventListener('click', onPlay);
		const wrapBtn = o.querySelector('#wrapBtn');
		wrapBtn.addEventListener('click', () => {
			onToggleWrap();
			wrapBtn.textContent = `Wrap: ${onToggleWrap.current ? 'On' : 'Off'}`;
		});
		const controlsBtn = o.querySelector('#controlsBtn');
		if (controlsBtn) controlsBtn.addEventListener('click', () => this.openControls());
		const infoBtn = o.querySelector('#infoBtn');
		infoBtn.addEventListener('click', () => this.openLegend());
	}
	hintOverlay(text) {
		const html = `<div class=\"subtitle\">${text}</div>`;
		const o = this.addOverlay(html, 'hint', false);
		setTimeout(() => o.remove(), 2000);
	}
	showError(message) {
		this.removeOverlays();
		const safe = (message + '').replace(/[<>]/g, (c) => ({ '<': '&lt;', '>': '&gt;' }[c]));
		const html = `
      <div class=\"title\" style=\"color: var(--danger)\">Oops — something went wrong</div>
      <div class=\"subtitle\" style=\"text-align:left;max-width:520px;white-space:pre-wrap\">${safe}</div>
      <div class=\"btns\"><button class=\"primary\" id=\"reloadBtn\">Reload</button></div>`;
		const o = this.addOverlay(html, 'error', true);
		o.querySelector('#reloadBtn').addEventListener('click', () => location.reload());
	}
	gameOver(score, best, hp, wrapWalls, onRestart, onToggleWrap) {
		const html = `
      <div class=\"title\" style=\"color: var(--danger)\">Game Over</div>
      <div class=\"subtitle\">Score: <strong>${score}</strong> · Best: <strong>${best}</strong> · HP: <strong>${hp}</strong></div>
      <div class=\"btns\">
        <button class=\"primary\" id=\"restartBtn\">Restart (R)</button>
        <button id=\"wrapToggle\">Wrap: ${wrapWalls ? 'On' : 'Off'}</button>
        <button class=\"info-btn\" id=\"infoBtn\" aria-label=\"Info\">ⓘ</button>
      </div>`;
		const o = this.addOverlay(html, 'over', false);
		o.querySelector('#restartBtn').addEventListener('click', onRestart);
		const wrapToggle = o.querySelector('#wrapToggle');
		wrapToggle.addEventListener('click', () => {
			onToggleWrap();
			wrapToggle.textContent = `Wrap: ${onToggleWrap.current ? 'On' : 'Off'}`;
		});
		const infoBtn = o.querySelector('#infoBtn');
		infoBtn.addEventListener('click', () => this.openLegend());
	}
	openLegend() {
		// If legend exists, remove it first to avoid stale canvases
		const existing = document.getElementById('legend');
		if (existing) existing.remove();
		const html = `
      <div class=\"title\">Legend & Controls</div>
      <div class=\"legend-item\"><canvas id=\"legend-icon-apple\" width=\"36\" height=\"36\"></canvas><div class=\"name\">Apple</div><div class=\"desc\">+1 score, grow by 1, slightly increases base speed.</div></div>
      <div class=\"legend-item\"><canvas id=\"legend-icon-banana\" width=\"36\" height=\"36\"></canvas><div class=\"name\">Banana</div><div class=\"desc\">Temporarily slows speed; duration scales with high score (capped).</div></div>
      <div class=\"legend-item\"><canvas id=\"legend-icon-orange\" width=\"36\" height=\"36\"></canvas><div class=\"name\">Orange</div><div class=\"desc\">+1 hitpoint up to a small maximum.</div></div>
      <div class=\"legend-item\"><canvas id=\"legend-icon-pear\" width=\"36\" height=\"36\"></canvas><div class=\"name\">Pear</div><div class=\"desc\">Spawns in pairs; eating one teleports you to the other.</div></div>
      <div class=\"legend-item\"><canvas id=\"legend-icon-cherry\" width=\"36\" height=\"36\"></canvas><div class=\"name\">Cherry</div><div class=\"desc\">Spawns on edges; when wrap is off: next move only, hit a wall to wrap once; otherwise just +1 score.</div></div>
      <div class=\"legend-item\"><canvas id=\"legend-icon-mouse\" width=\"36\" height=\"36\"></canvas><div class=\"name\">Mouse</div><div class=\"desc\">Moves in 8 directions, avoids the snake, eats fruits; +5 if eaten.</div></div>
      <div class=\"controls\">
        <div class=\"legend-title\">Controls</div>
        <div class=\"control-row\"><div class=\"kbdbar\"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></div><div class=\"desc\">Move the snake. You cannot reverse into yourself.</div></div>
        <div class=\"control-row\"><div class=\"kbdbar\"><kbd>P</kbd></div><div class=\"desc\">Pause / resume.</div></div>
        <div class=\"control-row\"><div class=\"kbdbar\"><kbd>R</kbd></div><div class=\"desc\">Restart from the current start state.</div></div>
        <div class=\"control-row\"><div class=\"kbdbar\"><kbd>T</kbd></div><div class=\"desc\">Toggle wrap-around walls.</div></div>
      </div>
      <div class=\"btns\"><button class=\"primary\" id=\"closeLegend\">Close</button></div>`;
		const o = this.addOverlay(html, 'legend', true);
		this.#game.updateKeyMap();
		this.#legendWasPlaying = this.#game.playing;
		this.#legendOpen = true;
		this.#game.playing = false;
		const draw = () => this.#game.drawLegendIcons('legend-');
		requestAnimationFrame(draw);
		setTimeout(draw, 50);
		o.querySelector('#closeLegend').addEventListener('click', () => {
			o.remove();
			this.#legendOpen = false;
			this.#game.playing = this.#legendWasPlaying;
		});
		return o;
	}
	openControls(onDone, require = false) {
		const current = this.#game.storage.getControls();
		const wasPlaying = this.#game.playing;
		this.#game.playing = false;
               const scheme = current && current.scheme ? current.scheme : 'wasd';
               let keys = current && current.keys
                       ? { ...current.keys }
                       : {
                               up: 'KeyW',
                               left: 'KeyA',
                               down: 'KeyS',
                               right: 'KeyD',
                               pause: 'KeyP',
                               restart: 'KeyR',
                               wrap: 'KeyT',
                       };
		const keyText = (code) => {
			if (!code) return '?';
			if (code.startsWith('Key')) return code.slice(3);
			const arrows = { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' };
			if (arrows[code]) return arrows[code];
			return code;
		};
		const html = `
      <div class="title">Choose Controls</div>
      <div style="margin-bottom:8px;text-align:left">
        <select id="schemeSelect">
          <option value="wasd" ${scheme === 'wasd' ? 'selected' : ''}>WASD</option>
          <option value="arrows" ${scheme === 'arrows' ? 'selected' : ''}>Arrow Keys</option>
          <option value="custom" ${scheme === 'custom' ? 'selected' : ''}>Custom</option>
        </select>
      </div>
      <div id="keyWrap">
        <label for="key-up">Up</label><button id="key-up" data-key="up"
                       class="primary">${keyText(keys.up)}</button>
        <label for="key-left">Left</label><button id="key-left" data-key="left"
                       class="primary">${keyText(keys.left)}</button>
        <label for="key-down">Down</label><button id="key-down" data-key="down"
                       class="primary">${keyText(keys.down)}</button>
        <label for="key-right">Right</label><button id="key-right" data-key="right"
                       class="primary">${keyText(keys.right)}</button>
        <label for="key-pause">Pause</label><button id="key-pause" data-key="pause"
                       class="primary">${keyText(keys.pause)}</button>
        <label for="key-restart">Restart</label><button id="key-restart" data-key="restart"
                       class="primary">${keyText(keys.restart)}</button>
        <label for="key-wrap">Wrap</label><button id="key-wrap" data-key="wrap"
                       class="primary">${keyText(keys.wrap)}</button>
      </div>
      <div class="btns">
        <button class="primary" id="saveControls">Save</button>
        ${require ? '' : '<button id="cancelControls">Cancel</button>'}
      </div>`;
		const o = this.addOverlay(html, 'controls', true);
		o.tabIndex = -1;
		o.focus();
		const finish = () => {
			o.remove();
			this.#game.playing = wasPlaying;
			if (onDone) onDone();
		};
		const select = o.querySelector('#schemeSelect');
               const updateButtons = () => {
                       for (const k of ['up', 'left', 'down', 'right', 'pause', 'restart', 'wrap']) {
                               const btn = o.querySelector(`button[data-key="${k}"]`);
                               if (btn) btn.textContent = keyText(keys[k]);
                       }
               };
               select.addEventListener('change', () => {
                       if (select.value === 'wasd') {
                               keys = {
                                       ...keys,
                                       up: 'KeyW',
                                       left: 'KeyA',
                                       down: 'KeyS',
                                       right: 'KeyD',
                               };
                       } else if (select.value === 'arrows') {
                               keys = {
                                       ...keys,
                                       up: 'ArrowUp',
                                       left: 'ArrowLeft',
                                       down: 'ArrowDown',
                                       right: 'ArrowRight',
                               };
                       }
                       updateButtons();
               });
		const keyButtons = o.querySelectorAll('button[data-key]');
		let capture = null;
		keyButtons.forEach((btn) => {
			btn.addEventListener('click', () => {
				capture = btn.getAttribute('data-key');
				btn.textContent = '?';
			});
		});
		const keyHandler = (ev) => {
			if (!capture) return;
			ev.preventDefault();
			keys[capture] = ev.code;
			const btn = o.querySelector(`button[data-key="${capture}"]`);
			if (btn) btn.textContent = keyText(ev.code);
			if (select.value !== 'custom') select.value = 'custom';
			capture = null;
		};
		o.addEventListener('keydown', keyHandler);
		o.querySelector('#saveControls').addEventListener('click', () => {
                       const chosen = select.value;
                       let saveKeys = { ...keys };
                       if (chosen === 'wasd') {
                               saveKeys = {
                                       ...keys,
                                       up: 'KeyW',
                                       left: 'KeyA',
                                       down: 'KeyS',
                                       right: 'KeyD',
                               };
                       } else if (chosen === 'arrows') {
                               saveKeys = {
                                       ...keys,
                                       up: 'ArrowUp',
                                       left: 'ArrowLeft',
                                       down: 'ArrowDown',
                                       right: 'ArrowRight',
                               };
                       }
                       this.#game.storage.setControls({ scheme: chosen, keys: saveKeys });
			this.#game.updateKeyMap();
			finish();
		});
		const cancelBtn = o.querySelector('#cancelControls');
		if (cancelBtn) {
			cancelBtn.addEventListener('click', () => {
				finish();
			});
		}
		return o;
	}
}

class ItemsManager {
	#items = [];
	#rng;
	constructor(rng) {
		this.#rng = rng || Math.random;
	}
	getItems() {
		return this.#items;
	}
	clear() {
		this.#items = [];
	}
	key(x, y) {
		return `${x},${y}`;
	}
	rndCell() {
		return { x: Math.floor(this.#rng() * Config.GRID), y: Math.floor(this.#rng() * Config.GRID) };
	}
	occupiedSet(snake) {
		const set = new Set(this.#items.map((it) => this.key(it.x, it.y)));
		for (const s of snake) set.add(this.key(s.x, s.y));
		return set;
	}
	spawnAtEmpty(snake) {
		const occ = this.occupiedSet(snake);
		let cell, guard = 0;
		do {
			cell = this.rndCell();
			guard++;
		} while (occ.has(this.key(cell.x, cell.y)) && guard < Config.GRID * Config.GRID);
		return cell;
	}
	spawnCherryAtEdge(snake) {
		const occ = this.occupiedSet(snake);
		let guard = 0;
		while (guard++ < Config.GRID * Config.GRID) {
			const side = Math.floor(this.#rng() * 4);
			let x = 0, y = 0;
			if (side === 0) {
				x = 0;
				y = Math.floor(this.#rng() * Config.GRID);
			} else if (side === 1) {
				x = Config.GRID - 1;
				y = Math.floor(this.#rng() * Config.GRID);
			} else if (side === 2) {
				y = 0;
				x = Math.floor(this.#rng() * Config.GRID);
			} else {
				y = Config.GRID - 1;
				x = Math.floor(this.#rng() * Config.GRID);
			}
			if (!occ.has(this.key(x, y))) return { x, y };
		}
		return this.spawnAtEmpty(snake);
	}
	ensureApple(snake) {
		if (!this.#items.some((it) => it.type === 'apple')) {
			const c = this.spawnAtEmpty(snake);
			this.#items.push({ type: 'apple', x: c.x, y: c.y });
		}
	}
	isSpecial(it) {
		return it.type === 'banana' || it.type === 'orange' || it.type === 'pear' ||
			it.type === 'cherry';
	}
	specialPresent() {
		return this.#items.some((it) => this.isSpecial(it));
	}
	maybeSpawnSpecial(snake) {
		if (this.specialPresent()) return;
		const pick = Math.floor(this.#rng() * 4);
		if (pick === 0) {
			const c = this.spawnAtEmpty(snake);
			this.#items.push({ type: 'banana', x: c.x, y: c.y });
			return;
		}
		if (pick === 1) {
			const c = this.spawnAtEmpty(snake);
			this.#items.push({ type: 'orange', x: c.x, y: c.y });
			return;
		}
		if (pick === 2) {
			const a = this.spawnAtEmpty(snake);
			const b = this.spawnAtEmpty(snake);
			const pid = this.#rng().toString(36).slice(2);
			this.#items.push({ type: 'pear', pair: pid, x: a.x, y: a.y });
			this.#items.push({ type: 'pear', pair: pid, x: b.x, y: b.y });
			return;
		}
		const e = this.spawnCherryAtEdge(snake);
		this.#items.push({ type: 'cherry', x: e.x, y: e.y });
	}
	eatAtForSnake(nx, ny, game) {
		const idx = this.#items.findIndex((it) => it.x === nx && it.y === ny);
		if (idx === -1) return { type: null };
		const it = this.#items[idx];
		if (it.type === 'apple') {
			this.#items.splice(idx, 1);
			game.incrementScore(1);
			this.ensureApple(game.snake.body);
			this.maybeSpawnSpecial(game.snake.body);
			return { type: 'apple' };
		}
		if (it.type === 'banana') {
			this.#items.splice(idx, 1);
			const best = game.storage.getHighScore();
			const dur = Math.min(
				Config.BANANA_MAX_MS,
				Config.BANANA_BASE_MS + best * Config.BANANA_PER_HS_MS,
			);
			game.applySlow(Config.BANANA_SLOW, performance.now() + dur);
			return { type: 'banana' };
		}
		if (it.type === 'orange') {
			this.#items.splice(idx, 1);
			if (game.hp < Config.MAX_HP) game.setHP(game.hp + 1);
			return { type: 'orange' };
		}
		if (it.type === 'pear') {
			const pid = it.pair;
			const other = this.#items.find((j, i2) => j.type === 'pear' && j.pair === pid && i2 !== idx);
			this.#items = this.#items.filter((j) => !(j.type === 'pear' && j.pair === pid));
			return { type: 'pear', tx: other ? other.x : nx, ty: other ? other.y : ny };
		}
		if (it.type === 'cherry') {
			this.#items.splice(idx, 1);
			game.incrementScore(1);
			game.armCherry();
			return { type: 'cherry' };
		}
		return { type: null };
	}
	eatAtForMouse(nx, ny, game) {
		const idx = this.#items.findIndex((it) => it.x === nx && it.y === ny);
		if (idx === -1) return { type: null };
		const it = this.#items[idx];
		if (it.type === 'apple') {
			this.#items.splice(idx, 1);
			this.ensureApple(game.snake.body);
			this.maybeSpawnSpecial(game.snake.body);
			return { type: 'apple' };
		}
		if (it.type === 'banana') {
			this.#items.splice(idx, 1);
			const best = game.storage.getHighScore();
			const dur = Math.min(
				Config.BANANA_MAX_MS,
				Config.BANANA_BASE_MS + best * Config.BANANA_PER_HS_MS,
			);
			game.mouse.boostAmount = Config.BANANA_SLOW;
			game.mouse.boostUntil = performance.now() + dur;
			return { type: 'banana' };
		}
		if (it.type === 'orange') {
			this.#items.splice(idx, 1);
			game.mouse.hp = (game.mouse.hp || 0) + 1;
			return { type: 'orange' };
		}
		if (it.type === 'pear') {
			const pid = it.pair;
			const other = this.#items.find((j, i2) => j.type === 'pear' && j.pair === pid && i2 !== idx);
			this.#items = this.#items.filter((j) => !(j.type === 'pear' && j.pair === pid));
			return { type: 'pear', tx: other ? other.x : nx, ty: other ? other.y : ny };
		}
		if (it.type === 'cherry') {
			this.#items.splice(idx, 1);
			if (!game.wrapWalls) game.mouse.cherryArmed = true;
			return { type: 'cherry' };
		}
		return { type: null };
	}
}

class SnakeModel {
	constructor() {
		this.body = [];
		this.dir = { x: 1, y: 0 };
		this.nextDir = { x: 1, y: 0 };
	}
	setIdle(cx, cy) {
		this.body = [{ x: cx + 1, y: cy }, { x: cx, y: cy }, { x: cx - 1, y: cy }];
		this.dir = { x: 1, y: 0 };
		this.nextDir = { x: 1, y: 0 };
	}
}
class MouseModel {
	constructor() {
		this.x = 0;
		this.y = 0;
		this.hp = 0;
		this.boostUntil = 0;
		this.boostAmount = 0;
		this.cherryArmed = false;
		this.alert = false;
	}
}

class Renderer {
	#ctx;
	#dpi;
	constructor(ctx, dpi) {
		this.#ctx = ctx;
		this.#dpi = dpi;
	}
	drawGrid() {
		const ctx = this.#ctx;
		const c = this.#dpi.getCellSize();
		const boardSize = this.#dpi.getBoardSize();
		ctx.save();
		ctx.strokeStyle = '#15202b';
		ctx.lineWidth = 1;
		ctx.globalAlpha = 0.8;
		for (let i = 1; i < Config.GRID; i++) {
			const p = Math.floor(i * c) + 0.5;
			ctx.beginPath();
			ctx.moveTo(p, 0);
			ctx.lineTo(p, boardSize);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(0, p);
			ctx.lineTo(boardSize, p);
			ctx.stroke();
		}
		ctx.restore();
	}
	roundRect(x, y, w, h, r) {
		const ctx = this.#ctx;
		ctx.beginPath();
		ctx.moveTo(x + r, y);
		ctx.arcTo(x + w, y, x + w, y + h, r);
		ctx.arcTo(x + w, y + h, x, y + h, r);
		ctx.arcTo(x, y + h, x, y, r);
		ctx.arcTo(x, y, x + w, y, r);
		ctx.closePath();
	}
	drawCell(x, y, color1, color2) {
		const ctx = this.#ctx;
		const c = this.#dpi.getCellSize();
		const px = x * c, py = y * c;
		const r = Math.max(4, Math.floor(c / 5));
		const grad = ctx.createLinearGradient(px, py, px, py + c);
		grad.addColorStop(0, color1);
		grad.addColorStop(1, color2);
		ctx.fillStyle = grad;
		this.roundRect(px + 1, py + 1, c - 2, c - 2, r);
		ctx.fill();
	}
	drawSnake(snake, dir) {
		const c = this.#dpi.getCellSize();
		if (!snake || snake.length === 0) return;
		for (let i = snake.length - 1; i >= 0; i--) {
			const s = snake[i];
			const t = i / Math.max(1, snake.length - 1);
			const base = 90 + Math.floor(t * 30);
			this.drawCell(s.x, s.y, `hsl(145, 70%, ${base}%)`, `hsl(145, 55%, ${base - 18}%)`);
		}
		const head = snake[0];
		if (!head) return;
		const ctx = this.#ctx;
		const cx = head.x * c + c / 2, cy = head.y * c + c / 2;
		ctx.save();
		ctx.fillStyle = '#0b1117';
		const ex = dir.x !== 0 ? (dir.x * c * 0.18) : c * 0.12;
		const ey = dir.y !== 0 ? (dir.y * c * 0.18) : c * 0.12;
		ctx.beginPath();
		ctx.arc(cx - ex, cy - ey, Math.max(2, c * 0.07), 0, Math.PI * 2);
		ctx.fill();
		ctx.beginPath();
		ctx.arc(cx + ex, cy + ey, Math.max(2, c * 0.07), 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
	}
	drawMouse(mouse) {
		if (!mouse) return;
		const ctx = this.#ctx;
		const c = this.#dpi.getCellSize();
		const px = mouse.x * c, py = mouse.y * c;
		const r = Math.max(4, Math.floor(c / 4));
		ctx.save();
		const grad = ctx.createRadialGradient(
			px + c * 0.35,
			py + c * 0.35,
			c * 0.05,
			px + c * 0.5,
			py + c * 0.5,
			c * 0.4,
		);
		grad.addColorStop(0, '#e5e7eb');
		grad.addColorStop(1, '#9ca3af');
		ctx.fillStyle = grad;
		this.roundRect(px + 2, py + 2, c - 4, c - 4, r);
		ctx.fill();

		// Eyes
		ctx.fillStyle = '#111827';
		ctx.beginPath();
		ctx.arc(px + c * 0.35, py + c * 0.38, Math.max(1.5, c * 0.06), 0, Math.PI * 2);
		ctx.arc(px + c * 0.65, py + c * 0.38, Math.max(1.5, c * 0.06), 0, Math.PI * 2);
		ctx.fill();

		// Mouth
		const mx = px + c * 0.5, my = py + c * 0.52;
		if (mouse.alert) {
			// Open mouth (surprised)
			ctx.fillStyle = '#111827';
			ctx.beginPath();
			ctx.ellipse(mx, my, c * 0.07, c * 0.1, 0, 0, Math.PI * 2);
			ctx.fill();
		} else {
			ctx.strokeStyle = '#111827';
			ctx.lineWidth = Math.max(1, c * 0.05);
			ctx.lineCap = 'round';
			ctx.beginPath();
			ctx.moveTo(mx, my - c * 0.06);
			ctx.lineTo(mx, my - c * 0.01);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(mx, my - c * 0.01);
			ctx.quadraticCurveTo(mx - c * 0.05, my + c * 0.05, mx - c * 0.1, my + c * 0.02);
			ctx.moveTo(mx, my - c * 0.01);
			ctx.quadraticCurveTo(mx + c * 0.05, my + c * 0.05, mx + c * 0.1, my + c * 0.02);
			ctx.stroke();
		}

		// Alert icon: red exclamation at top-right
		if (mouse.alert) {
			ctx.save();
			ctx.fillStyle = '#ef4444';
			const ax = px + c * 0.76, ay = py + c * 0.12;
			const barW = Math.max(1.2, c * 0.06), barH = c * 0.18;
			ctx.fillRect(ax - barW / 2, ay - barH / 2, barW, barH);
			ctx.beginPath();
			ctx.arc(ax, ay + barH / 2 + c * 0.03, Math.max(1.2, c * 0.025), 0, Math.PI * 2);
			ctx.fill();
			ctx.restore();
		}

		ctx.restore();
	}
	drawApple(g, px, py, c) {
		const r = g.createRadialGradient(
			px + c * 0.55,
			py + c * 0.45,
			c * 0.1,
			px + c * 0.5,
			py + c * 0.5,
			c * 0.5,
		);
		r.addColorStop(0, '#ffb4b4');
		r.addColorStop(1, '#f87171');
		g.fillStyle = r;
		g.beginPath();
		g.moveTo(px + c * 0.18 + c * 0.18, py + c * 0.18);
		g.arcTo(px + c * 0.82, py + c * 0.18, px + c * 0.82, py + c * 0.82, c * 0.18);
		g.arcTo(px + c * 0.82, py + c * 0.82, px + c * 0.18, py + c * 0.82, c * 0.18);
		g.arcTo(px + c * 0.18, py + c * 0.82, px + c * 0.18, py + c * 0.18, c * 0.18);
		g.arcTo(px + c * 0.18, py + c * 0.18, px + c * 0.82, py + c * 0.18, c * 0.18);
		g.closePath();
		g.fill();
		g.strokeStyle = '#34d399';
		g.lineWidth = Math.max(1.5, c * 0.05);
		g.beginPath();
		g.moveTo(px + c * 0.5, py + c * 0.15);
		g.quadraticCurveTo(px + c * 0.7, py + c * 0.0, px + c * 0.78, py + c * 0.18);
		g.stroke();
	}
	drawBanana(g, px, py, c) {
		g.save();
		g.translate(px + c * 0.5, py + c * 0.5);
		g.rotate(-0.3);
		g.fillStyle = '#fde047';
		g.beginPath();
		g.ellipse(0, 0, c * 0.35, c * 0.18, 0, 0, Math.PI * 2);
		g.fill();
		g.fillStyle = '#78350f';
		g.beginPath();
		g.arc(-c * 0.3, 0, c * 0.04, 0, Math.PI * 2);
		g.fill();
		g.beginPath();
		g.arc(c * 0.3, 0, c * 0.04, 0, Math.PI * 2);
		g.fill();
		g.restore();
	}
	drawOrange(g, px, py, c) {
		const r = g.createRadialGradient(
			px + c * 0.55,
			py + c * 0.45,
			c * 0.1,
			px + c * 0.5,
			py + c * 0.5,
			c * 0.5,
		);
		r.addColorStop(0, '#ffd7a3');
		r.addColorStop(1, '#fb923c');
		g.fillStyle = r;
		g.beginPath();
		g.arc(px + c * 0.5, py + c * 0.5, c * 0.32, 0, Math.PI * 2);
		g.fill();
		g.strokeStyle = '#f59e0b';
		g.beginPath();
		g.moveTo(px + c * 0.5, py + c * 0.18);
		g.lineTo(px + c * 0.62, py + c * 0.06);
		g.stroke();
	}
	drawPear(g, px, py, c) {
		g.save();
		g.translate(px + c * 0.5, py + c * 0.55);
		g.fillStyle = '#86efac';
		g.beginPath();
		g.moveTo(0, -c * 0.2);
		g.bezierCurveTo(c * 0.3, -c * 0.2, c * 0.35, c * 0.15, 0, c * 0.3);
		g.bezierCurveTo(-c * 0.35, c * 0.15, -c * 0.3, -c * 0.2, 0, -c * 0.2);
		g.fill();
		g.strokeStyle = '#166534';
		g.beginPath();
		g.moveTo(0, -c * 0.28);
		g.lineTo(0, -c * 0.45);
		g.stroke();
		g.restore();
	}
	drawCherry(g, px, py, c) {
		g.save();
		g.translate(px + c * 0.5, py + c * 0.5);
		g.fillStyle = '#ef4444';
		g.beginPath();
		g.arc(-c * 0.12, c * 0.1, c * 0.16, 0, Math.PI * 2);
		g.arc(c * 0.16, c * 0.04, c * 0.16, 0, Math.PI * 2);
		g.fill();
		g.strokeStyle = '#10b981';
		g.lineWidth = Math.max(1.2, c * 0.05);
		g.beginPath();
		g.moveTo(-c * 0.12, c * 0.1);
		g.quadraticCurveTo(-c * 0.1, -c * 0.2, 0, -c * 0.25);
		g.moveTo(c * 0.16, c * 0.04);
		g.quadraticCurveTo(c * 0.2, -c * 0.2, 0, -c * 0.25);
		g.stroke();
		g.restore();
	}
	drawMouseIcon(g, px, py, c) {
		const r = Math.max(3, Math.floor(c / 4));
		const rr = (g2, x, y, w, h, rad) => {
			g2.beginPath();
			g2.moveTo(x + rad, y);
			g2.arcTo(x + w, y, x + w, y + h, rad);
			g2.arcTo(x + w, y + h, x, y + h, rad);
			g2.arcTo(x, y + h, x, y, rad);
			g2.arcTo(x, y, x + w, y, rad);
			g2.closePath();
		};
		const grad = g.createRadialGradient(
			px + c * 0.35,
			py + c * 0.35,
			c * 0.05,
			px + c * 0.5,
			py + c * 0.5,
			c * 0.4,
		);
		grad.addColorStop(0, '#e5e7eb');
		grad.addColorStop(1, '#9ca3af');
		g.fillStyle = grad;
		rr(g, px + 2, py + 2, c - 4, c - 4, r);
		g.fill();
		g.fillStyle = '#111827';
		g.beginPath();
		g.arc(px + c * 0.35, py + c * 0.38, Math.max(1.2, c * 0.06), 0, Math.PI * 2);
		g.arc(px + c * 0.65, py + c * 0.38, Math.max(1.2, c * 0.06), 0, Math.PI * 2);
		g.fill();
		g.strokeStyle = '#111827';
		g.lineWidth = Math.max(1, c * 0.05);
		g.lineCap = 'round';
		const mx = px + c * 0.5, my = py + c * 0.52;
		g.beginPath();
		g.moveTo(mx, my - c * 0.06);
		g.lineTo(mx, my - c * 0.01);
		g.stroke();
		g.beginPath();
		g.moveTo(mx, my - c * 0.01);
		g.quadraticCurveTo(mx - c * 0.05, my + c * 0.05, mx - c * 0.1, my + c * 0.02);
		g.moveTo(mx, my - c * 0.01);
		g.quadraticCurveTo(mx + c * 0.05, my + c * 0.05, mx + c * 0.1, my + c * 0.02);
		g.stroke();
	}
	drawItems(items) {
		const g = this.#ctx;
		const c = this.#dpi.getCellSize();
		for (const it of items) {
			const px = it.x * c, py = it.y * c;
			if (it.type === 'apple') this.drawApple(g, px, py, c);
			else if (it.type === 'banana') this.drawBanana(g, px, py, c);
			else if (it.type === 'orange') this.drawOrange(g, px, py, c);
			else if (it.type === 'pear') this.drawPear(g, px, py, c);
			else if (it.type === 'cherry') this.drawCherry(g, px, py, c);
		}
	}
	drawLegendIcons(prefix = '') {
		const make = (id, fn) => {
			const c = document.getElementById(prefix + id);
			if (!c) return;
			const g = c.getContext('2d');
			const s = Math.min(c.width, c.height);
			g.clearRect(0, 0, c.width, c.height);
			fn(g, (c.width - s) / 2, (c.height - s) / 2, s);
		};
		make('icon-apple', this.drawApple.bind(this));
		make('icon-banana', this.drawBanana.bind(this));
		make('icon-orange', this.drawOrange.bind(this));
		make('icon-pear', this.drawPear.bind(this));
		make('icon-cherry', this.drawCherry.bind(this));
		make('icon-mouse', this.drawMouseIcon.bind(this));
	}
	drawFrame(items, mouse, snake, dir) {
		const ctx = this.#ctx;
		const board = this.#dpi.getBoardSize();
		ctx.clearRect(0, 0, board, board);
		this.drawGrid();
		this.drawItems(items);
		this.drawMouse(mouse);
		this.drawSnake(snake, dir);
		const vg = ctx.createRadialGradient(
			board / 2,
			board * 0.35,
			board * 0.2,
			board / 2,
			board / 2,
			board * 0.75,
		);
		vg.addColorStop(0, 'rgba(0,0,0,0)');
		vg.addColorStop(1, 'rgba(0,0,0,0.18)');
		ctx.fillStyle = vg;
		ctx.fillRect(0, 0, board, board);
	}
}

class Game {
	#hud;
	#overlay;
	#storage;
	#dpi;
	#renderer;
	#items;
	#errorOverlay;
	playing = false;
	wrapWalls = false;
	lastTime = 0;
	acc = 0;
	mouseAcc = 0;
	score = 0;
	hp = 0;
	slowUntil = 0;
	slowAmount = 0;
	cherrySteps = 0;
	snake;
	mouse;
	constructor(canvas) {
		this.#hud = new HUDService();
		this.#storage = new StorageService();
		this.#dpi = new DpiScalerService(canvas, () => {});
		this.#renderer = new Renderer(this.#dpi.getCtx(), this.#dpi);
		this.#items = new ItemsManager();
		this.#overlay = new OverlayManager(this);
		this.#errorOverlay = new ErrorOverlayService(this.#overlay);
		this.snake = new SnakeModel();
		this.mouse = new MouseModel();
               this.keyMap = {};
               this.pauseKey = 'KeyP';
               this.restartKey = 'KeyR';
               this.wrapKey = 'KeyT';
               this.isTouch = false;
               this.loop = this.loop.bind(this);
	}
	get storage() {
		return this.#storage;
	}
	drawLegendIcons(prefix = '') {
		this.#renderer.drawLegendIcons(prefix);
	}
	init() {
		this.#errorOverlay.installGlobalHandlers();
		this.#dpi.install();
		const best = this.#storage.getHighScore();
		this.#hud.setHighScore(best);
		this.isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
		this.setInitialIdleState();
		this.#renderer.drawLegendIcons();
		requestAnimationFrame(this.loop);
		this.installInput();
		const infoHeaderBtn = document.getElementById('infoHeaderBtn');
		if (infoHeaderBtn) infoHeaderBtn.addEventListener('click', () => this.#overlay.openLegend());
		const controlsHeaderBtn = document.getElementById('controlsHeaderBtn');
		if (controlsHeaderBtn && !this.isTouch) {
			controlsHeaderBtn.addEventListener('click', () => this.#overlay.openControls());
		}
		const controls = this.#storage.getControls();
		if (!this.isTouch && !controls) {
			this.#overlay.openControls(() => {
				this.updateKeyMap();
				this.#overlay.startOverlay(this.wrapWalls, () => this.reset(), this.createWrapToggle());
			}, true);
		} else {
			this.updateKeyMap();
			this.#overlay.startOverlay(this.wrapWalls, () => this.reset(), this.createWrapToggle());
		}
	}
	createWrapToggle() {
		const fn = () => {
			this.wrapWalls = !this.wrapWalls;
			fn.current = this.wrapWalls;
		};
		fn.current = this.wrapWalls;
		return fn;
	}
	updateLegendControls(keys) {
		const containers = document.querySelectorAll('.controls');
		const txt = (code) => {
			if (!code) return '?';
			if (code.startsWith('Key')) return code.slice(3);
			const map = { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' };
			return map[code] || code;
		};
		const order = [keys.up, keys.left, keys.down, keys.right];
		containers.forEach((cont) => {
			const bar = cont.querySelector('.control-row .kbdbar');
			if (!bar) return;
			const kbds = bar.querySelectorAll('kbd');
			order.forEach((code, idx) => {
				if (kbds[idx]) kbds[idx].textContent = txt(code);
			});
		});
	}
	updateKeyMap() {
               const cfg = this.#storage.getControls();
               const keys = cfg && cfg.keys
                       ? cfg.keys
                       : {
                               up: 'KeyW',
                               left: 'KeyA',
                               down: 'KeyS',
                               right: 'KeyD',
                               pause: 'KeyP',
                               restart: 'KeyR',
                               wrap: 'KeyT',
                       };
               this.keyMap = {
                       [keys.up]: { x: 0, y: -1 },
                       [keys.down]: { x: 0, y: 1 },
                       [keys.left]: { x: -1, y: 0 },
                       [keys.right]: { x: 1, y: 0 },
               };
               this.pauseKey = keys.pause || 'KeyP';
               this.restartKey = keys.restart || 'KeyR';
               this.wrapKey = keys.wrap || 'KeyT';
               this.updateLegendControls(keys);
	}
	setInitialIdleState() {
		const cx = Math.floor(Config.GRID / 2);
		const cy = Math.floor(Config.GRID / 2);
		this.snake.setIdle(cx, cy);
		this.score = 0;
		this.#hud.setScore(this.score);
		this.setHP(0);
		this.slowUntil = 0;
		this.slowAmount = 0;
		this.cherrySteps = 0;
		if (this.wrapWalls === undefined) this.wrapWalls = false;
		this.lastTime = 0;
		this.acc = 0;
		this.mouseAcc = 0;
		this.#items.clear();
		this.#items.ensureApple(this.snake.body);
		this.mouse = this.spawnMouse();
		this.updateCPSHud();
	}
	reset() {
		this.playing = true;
		this.lastTime = 0;
		this.acc = 0;
		this.mouseAcc = 0;
		this.#overlay.removeOverlays();
		this.updateCPSHud();
		this.#overlay.hintOverlay('Pause with P · Toggle wrap with T');
	}
	newGame() {
		this.setInitialIdleState();
		this.reset();
	}
	spawnMouse() {
		const occ = this.#items.occupiedSet(this.snake.body);
		let c, guard = 0;
		do {
			c = this.#items.rndCell();
			guard++;
		} while (occ.has(this.#items.key(c.x, c.y)) && guard < Config.GRID * Config.GRID);
		const m = new MouseModel();
		m.x = c.x;
		m.y = c.y;
		return m;
	}
	incrementScore(delta) {
		this.score += delta;
		this.#hud.setScore(this.score);
	}
	setHP(value) {
		this.hp = value;
		this.#hud.setHP(this.hp);
	}
	applySlow(amount, until) {
		this.slowAmount = amount;
		this.slowUntil = until;
		this.updateCPSHud();
	}
	armCherry() {
		this.cherrySteps = this.wrapWalls ? 0 : 1;
	}
	getBaseCPS() {
		return Math.min(Config.MAX_CPS, Config.BASE_CPS + this.score * Config.CPS_INC);
	}
	getCPS() {
		const now = performance.now();
		const slow = (this.slowUntil && now < this.slowUntil) ? this.slowAmount : 0;
		const base = this.getBaseCPS();
		const cps = Math.max(Config.MIN_CPS, base - slow);
		const baseFactor = base / Config.BASE_CPS;
		const effectFactor = Math.min(1, cps / base);
		const speedText = effectFactor < 1
			? `${baseFactor.toFixed(1)}x (×${effectFactor.toFixed(2)})`
			: `${baseFactor.toFixed(1)}x`;
		this.#hud.setSpeedText(speedText);
		const remain = Math.max(0, (this.slowUntil || 0) - now);
		this.#hud.setSlowText(`${(remain / 1000).toFixed(1)}s`);
		return cps;
	}
	getMouseCPS() {
		const now = performance.now();
		const boost = (this.mouse && this.mouse.boostUntil && now < this.mouse.boostUntil)
			? this.mouse.boostAmount
			: 0;
		return Math.max(
			Config.MIN_MOUSE_CPS,
			Math.min(Config.MAX_MOUSE_CPS, Config.BASE_MOUSE_CPS + boost),
		);
	}
	updateCPSHud() {
		this.getCPS();
	}
	installInput() {
		this.updateKeyMap();
		const applyDir = (nd) => {
			if (!nd) return;
			if (this.snake.body.length > 1 && nd.x === -this.snake.dir.x && nd.y === -this.snake.dir.y) {
				return;
			}
			this.snake.nextDir = nd;
		};
               document.addEventListener('keydown', (e) => {
                       const keyTxt = (code) => {
                               if (!code) return '?';
                               if (code.startsWith('Key')) return code.slice(3);
                               const map = {
                                       ArrowUp: '↑',
                                       ArrowDown: '↓',
                                       ArrowLeft: '←',
                                       ArrowRight: '→',
                               };
                               return map[code] || code;
                       };
                       if (this.keyMap[e.code]) {
                               applyDir(this.keyMap[e.code]);
                               e.preventDefault();
                       } else if (e.code === this.pauseKey) {
                               this.playing = !this.playing;
                               if (this.playing) this.#overlay.removeOverlays();
                               else this.#overlay.hintOverlay(
                                       `Paused — press ${keyTxt(this.pauseKey)} to resume`,
                               );
                       } else if (e.code === this.restartKey) {
                               this.newGame();
                       } else if (e.code === this.wrapKey) {
                               this.wrapWalls = !this.wrapWalls;
                               this.#overlay.hintOverlay(`Wrap: ${this.wrapWalls ? 'On' : 'Off'}`);
                       }
               });

		// Touchpad buttons
		const mapDir = (name) =>
			name === 'up'
				? { x: 0, y: -1 }
				: name === 'down'
				? { x: 0, y: 1 }
				: name === 'left'
				? { x: -1, y: 0 }
				: name === 'right'
				? { x: 1, y: 0 }
				: null;
		document.querySelectorAll('[data-dir]')?.forEach((btn) => {
			const dirName = btn.getAttribute('data-dir');
			btn.addEventListener('pointerdown', (ev) => {
				ev.preventDefault();
				applyDir(mapDir(dirName));
			});
		});
		document.querySelectorAll('[data-action="pause"]').forEach((btn) => {
			btn.addEventListener('pointerdown', (ev) => {
				ev.preventDefault();
				this.playing = !this.playing;
				if (this.playing) this.#overlay.removeOverlays();
				else this.#overlay.hintOverlay('Paused — touch ⏯ to resume');
			});
		});

		// Swipe gestures on canvas
		const board = document.getElementById('board');
		if (board) {
			let startX = 0, startY = 0, tracking = false;
			const reset = () => {
				tracking = false;
			};
			const onDown = (e) => {
				const p = e.touches ? e.touches[0] : e;
				startX = p.clientX;
				startY = p.clientY;
				tracking = true;
				e.preventDefault();
			};
			const onUp = (e) => {
				if (!tracking) return;
				const p = e.changedTouches ? e.changedTouches[0] : e;
				const dx = p.clientX - startX, dy = p.clientY - startY;
				const ax = Math.abs(dx), ay = Math.abs(dy);
				const thr = 16;
				if (ax > thr || ay > thr) {
					if (ax > ay) applyDir(dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 });
					else applyDir(dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 });
				}
				reset();
				e.preventDefault();
			};
			board.addEventListener('pointerdown', onDown, { passive: false });
			board.addEventListener('pointerup', onUp, { passive: false });
			board.addEventListener('pointercancel', reset, { passive: true });
			board.addEventListener('touchstart', onDown, { passive: false });
			board.addEventListener('touchend', onUp, { passive: false });
			board.addEventListener('touchcancel', reset, { passive: true });
		}
	}
	safeForMouse(x, y) {
		if (!this.wrapWalls && (x < 0 || y < 0 || x >= Config.GRID || y >= Config.GRID)) return false;
		const k = this.#items.key((x + Config.GRID) % Config.GRID, (y + Config.GRID) % Config.GRID);
		for (let i = 0; i < this.snake.body.length; i++) {
			if (this.#items.key(this.snake.body[i].x, this.snake.body[i].y) === k) return false;
		}
		return true;
	}

	// Distance helpers
	torusDelta(a, b) {
		const n = Config.GRID;
		const d = Math.abs(a - b);
		return Math.min(d, n - d);
	}
	chebyshevDistance(ax, ay, bx, by, torus) {
		if (torus) {
			const dx = this.torusDelta(ax, bx);
			const dy = this.torusDelta(ay, by);
			return Math.max(dx, dy);
		}
		return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
	}

	// BFS to nearest item; returns next step delta or null
	findMousePathStepToNearestItem() {
		const dirs = [
			{ x: -1, y: -1 },
			{ x: 0, y: -1 },
			{ x: 1, y: -1 },
			{ x: -1, y: 0 },
			{ x: 1, y: 0 },
			{ x: -1, y: 1 },
			{ x: 0, y: 1 },
			{ x: 1, y: 1 },
		];
		const start = { x: this.mouse.x, y: this.mouse.y };
		const goals = new Set(this.#items.getItems().map((it) => this.#items.key(it.x, it.y)));
		if (goals.size === 0) return null;

		const queue = [];
		const visited = new Set();
		const prev = new Map();

		const norm = (x, y) => ({
			x: (x + Config.GRID) % Config.GRID,
			y: (y + Config.GRID) % Config.GRID,
		});
		const key = (x, y) => this.#items.key(x, y);

		const s0 = this.wrapWalls ? norm(start.x, start.y) : { x: start.x, y: start.y };
		queue.push(s0);
		visited.add(key(s0.x, s0.y));

		while (queue.length) {
			const cur = queue.shift();
			const curKey = key(cur.x, cur.y);
			if (goals.has(curKey)) {
				// reconstruct first step
				let nodeKey = curKey;
				let node = cur;
				while (prev.has(nodeKey)) {
					const p = prev.get(nodeKey);
					if (p && (p.x === s0.x && p.y === s0.y)) {
						// first step from start to node
						const dx = node.x - s0.x;
						const dy = node.y - s0.y;
						const ndx = this.wrapWalls
							? ((dx + Config.GRID + Config.GRID / 2) % Config.GRID - Config.GRID / 2)
							: dx; // choose shortest wrapped delta
						const ndy = this.wrapWalls
							? ((dy + Config.GRID + Config.GRID / 2) % Config.GRID - Config.GRID / 2)
							: dy;
						return { x: Math.sign(ndx), y: Math.sign(ndy) };
					}
					node = p;
					nodeKey = key(node.x, node.y);
				}
				// If goal is start
				return { x: 0, y: 0 };
			}
			for (const d of dirs) {
				let nx = cur.x + d.x, ny = cur.y + d.y;
				if (this.wrapWalls) {
					const t = norm(nx, ny);
					nx = t.x;
					ny = t.y;
				} else if (nx < 0 || ny < 0 || nx >= Config.GRID || ny >= Config.GRID) continue;
				const k = key(nx, ny);
				if (visited.has(k)) continue;
				if (!this.safeForMouse(nx, ny)) continue;
				visited.add(k);
				queue.push({ x: nx, y: ny });
				prev.set(k, cur);
			}
		}
		return null;
	}

	pickMouseMove() {
		const dirs = [
			{ x: -1, y: -1 },
			{ x: 0, y: -1 },
			{ x: 1, y: -1 },
			{ x: -1, y: 0 },
			{ x: 1, y: 0 },
			{ x: -1, y: 1 },
			{ x: 0, y: 1 },
			{ x: 1, y: 1 },
		];
		const m = this.mouse;

		// Detect proximity to snake head
		const head = this.snake.body[0];
		const isTorus = !!this.wrapWalls;
		const distToHead = head ? this.chebyshevDistance(m.x, m.y, head.x, head.y, isTorus) : 99;
		m.alert = distToHead <= Config.MOUSE_ALERT_DIST;

		// Special: if wrap is off and cherry is armed, prefer using a boundary step to escape
		if (!this.wrapWalls && m.cherryArmed) {
			const out = dirs.filter((d) => {
				const nx = m.x + d.x, ny = m.y + d.y;
				return nx < 0 || ny < 0 || nx >= Config.GRID || ny >= Config.GRID;
			});
			if (out.length) {
				const card = out.filter((d) => d.x === 0 || d.y === 0);
				let cand = card.length ? card : out;
				const prefer = cand.filter((d) =>
					(m.x === 0 || m.x === Config.GRID - 1) ? d.y === 0 : d.x === 0
				);
				if (prefer.length) cand = prefer;
				return cand[Math.floor(Math.random() * cand.length)];
			}
			let best = null, bestd = 1e9;
			for (const d of dirs) {
				const nx = m.x + d.x, ny = m.y + d.y;
				if (!this.safeForMouse(nx, ny)) continue;
				const ndist = Math.min(nx, Config.GRID - 1 - nx, ny, Config.GRID - 1 - ny);
				if (ndist < bestd) {
					bestd = ndist;
					best = d;
				}
			}
			if (best) return best;
		}

		// If in danger, flee: choose safe move maximizing distance from snake head
		if (m.alert && head) {
			const candidates = dirs.map((d) => {
				let nx = m.x + d.x, ny = m.y + d.y;
				if (this.wrapWalls) {
					nx = (nx + Config.GRID) % Config.GRID;
					ny = (ny + Config.GRID) % Config.GRID;
				}
				return { d, nx, ny };
			}).filter((n) => this.safeForMouse(n.nx, n.ny));
			if (candidates.length) {
				let best = candidates[0], bestScore = -1;
				for (const c of candidates) {
					const score = this.chebyshevDistance(c.nx, c.ny, head.x, head.y, isTorus);
					if (score > bestScore) {
						bestScore = score;
						best = c;
					}
				}
				return best.d;
			}
		}

		// Otherwise, pathfind to nearest item
		const step = this.findMousePathStepToNearestItem();
		if (step && (step.x !== 0 || step.y !== 0)) {
			// Ensure the chosen step is safe (extra guard)
			let nx = m.x + step.x, ny = m.y + step.y;
			if (this.wrapWalls) {
				nx = (nx + Config.GRID) % Config.GRID;
				ny = (ny + Config.GRID) % Config.GRID;
			}
			if (this.safeForMouse(nx, ny)) return step;
		}

		// Fallback: pick any safe move
		const cand = dirs.filter((d) => {
			let nx = m.x + d.x, ny = m.y + d.y;
			if (this.wrapWalls) {
				nx = (nx + Config.GRID) % Config.GRID;
				ny = (ny + Config.GRID) % Config.GRID;
			}
			return this.safeForMouse(nx, ny);
		});
		if (cand.length === 0) return { x: 0, y: 0 };
		return cand[Math.floor(Math.random() * cand.length)];
	}
	tickMouse() {
		if (!this.playing) return;
		const mv = this.pickMouseMove();
		let nx = this.mouse.x + mv.x, ny = this.mouse.y + mv.y;
		let usedCherry = false;
		if (nx < 0 || ny < 0 || nx >= Config.GRID || ny >= Config.GRID) {
			if (this.wrapWalls || this.mouse.cherryArmed) {
				nx = (nx + Config.GRID) % Config.GRID;
				ny = (ny + Config.GRID) % Config.GRID;
				usedCherry = !this.wrapWalls && this.mouse.cherryArmed;
				if (!this.wrapWalls && usedCherry) {
					if (mv.x !== 0) ny = this.mouse.y;
					if (mv.y !== 0) nx = this.mouse.x;
				}
			} else return;
		}
		if (!this.safeForMouse(nx, ny)) return;
		const pre = this.#items.eatAtForMouse(nx, ny, this);
		if (pre.type === 'pear') {
			nx = pre.tx;
			ny = pre.ty;
		}
		this.mouse.x = nx;
		this.mouse.y = ny;
		if (usedCherry) this.mouse.cherryArmed = false;
	}
	gameOver() {
		this.playing = false;
		const best = Math.max(this.score, this.#storage.getHighScore());
		this.#storage.setHighScore(best);
		this.#hud.setHighScore(best);
		this.#overlay.gameOver(
			this.score,
			best,
			this.hp,
			this.wrapWalls,
			() => this.newGame(),
			this.createWrapToggle(),
		);
	}
	tick() {
		if (!this.playing) return;
		this.snake.dir = this.snake.nextDir;
		let nx = this.snake.body[0].x + this.snake.dir.x;
		let ny = this.snake.body[0].y + this.snake.dir.y;
		const hadCherry = this.cherrySteps > 0;
		if (nx < 0 || ny < 0 || nx >= Config.GRID || ny >= Config.GRID) {
			if (this.wrapWalls || (hadCherry && !this.wrapWalls)) {
				nx = (nx + Config.GRID) % Config.GRID;
				ny = (ny + Config.GRID) % Config.GRID;
			} else {
				this.gameOver();
				return;
			}
		}
		let ate = false;
		const pre = this.#items.eatAtForSnake(nx, ny, this);
		if (pre.type === 'pear') {
			nx = pre.tx;
			ny = pre.ty;
			ate = true;
		} else if (pre.type) ate = true;

		const collIndex = this.snake.body.findIndex((s, i) => i && s.x === nx && s.y === ny);
		if (collIndex >= 0) {
			if (this.hp > 0) {
				this.setHP(this.hp - 1);
				this.snake.body = this.snake.body.slice(0, collIndex);
			} else {
				this.gameOver();
				return;
			}
		}
		this.snake.body.unshift({ x: nx, y: ny });

		if (this.mouse && this.mouse.x === nx && this.mouse.y === ny) {
			if ((this.mouse.hp || 0) > 0) {
				this.mouse.hp -= 1;
				const m2 = this.spawnMouse();
				this.mouse.x = m2.x;
				this.mouse.y = m2.y;
				this.mouse.cherryArmed = false;
				this.mouse.boostUntil = 0;
			} else {
				this.incrementScore(5);
				this.mouse = this.spawnMouse();
				ate = true;
			}
		}

		if (
			pre.type === 'apple' || pre.type === 'banana' || pre.type === 'orange' ||
			pre.type === 'cherry'
		) this.updateCPSHud();
		if (!ate) {
			const post = this.#items.eatAtForSnake(nx, ny, this);
			if (
				post.type === 'apple' || post.type === 'banana' || post.type === 'orange' ||
				post.type === 'cherry'
			) this.updateCPSHud();
			else this.snake.body.pop();
		}
		if (hadCherry) this.cherrySteps = 0;
	}
	loop(ts) {
		try {
			if (!this.lastTime) this.lastTime = ts;
			const dt = (ts - this.lastTime) / 1000;
			this.lastTime = ts;
			this.acc += dt;
			this.mouseAcc += dt;
			for (;;) {
				const stepS = 1 / this.getCPS();
				if (this.acc < stepS) break;
				this.tick();
				this.acc -= stepS;
			}
			for (;;) {
				const stepM = 1 / this.getMouseCPS();
				if (this.mouseAcc < stepM) break;
				this.tickMouse();
				this.mouseAcc -= stepM;
			}
			this.updateCPSHud();
			this.#renderer.drawFrame(this.#items.getItems(), this.mouse, this.snake.body, this.snake.dir);
		} catch (err) {
			this.#errorOverlay.handle(err);
			return;
		}
		if (!this.#errorOverlay.isCaptured()) requestAnimationFrame(this.loop);
	}
}

if (typeof window !== 'undefined') {
	(function main() {
		const canvas = document.getElementById('board');
		const game = new Game(canvas);
		game.init();
	})();
}
