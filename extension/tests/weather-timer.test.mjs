import test from 'node:test';
import assert from 'node:assert/strict';
import { remaining, reconcileTimer, startTimer, pauseTimer, resetTimer, advanceTimer } from '../lib/timer.js';
import { fetchWeather, searchCities, weatherLabel, hasWeatherAccess, requestWeatherAccess, locateCity } from '../lib/weather.js';

const idle = () => ({ mode: 'work', workMinutes: 25, breakMinutes: 5, status: 'idle', remainingMs: 25 * 60000, endsAt: null, sound: false, focusView: false, completedAt: null });
const city = { name: 'La Paz', label: 'La Paz, Bolivia', latitude: -16.5, longitude: -68.15 };
const cityKey = '-16.5,-68.15';
const response = data => ({ ok: true, json: async () => data });

function replaceGlobal(t, name, value) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  t.after(() => previous ? Object.defineProperty(globalThis, name, previous) : delete globalThis[name]);
}

test('timer persists an absolute deadline through suspension and stops at one boundary', () => {
  const initial = idle();
  const started = startTimer(initial, 1000);
  assert.equal(initial.status, 'idle', 'functions preserve the input snapshot');
  assert.equal(started.endsAt, 1501000);
  assert.equal(remaining(JSON.parse(JSON.stringify(started)), 301000), 1200000);
  const restored = reconcileTimer(JSON.parse(JSON.stringify(started)), 12 * 60 * 60000);
  assert.equal(restored.status, 'complete');
  assert.equal(restored.mode, 'break');
  assert.equal(restored.remainingMs, 5 * 60000);
  assert.equal(restored.endsAt, null);
  assert.equal(restored.completedAt, 1501000, 'completion keeps the original deadline');
  assert.deepEqual(reconcileTimer(restored, 24 * 60 * 60000), restored, 'missed time never starts endless sessions');
});

test('pause and resume retain elapsed time while paused time does not count', () => {
  const started = startTimer(idle(), 1000);
  const paused = pauseTimer(started, 61000);
  assert.equal(paused.status, 'paused');
  assert.equal(paused.remainingMs, 24 * 60000);
  assert.equal(remaining(paused, 86400000), 24 * 60000);
  assert.equal(paused.endsAt, null);
  const resumed = startTimer(paused, 86400000);
  assert.equal(resumed.endsAt, 86400000 + 24 * 60000);
  assert.equal(remaining(resumed, resumed.endsAt - 1), 1);
  assert.equal(remaining(resumed, resumed.endsAt), 0);
});

test('pause after the deadline completes; completed break returns work ready', () => {
  const ended = pauseTimer(startTimer(idle(), 0), 1500000);
  assert.equal(ended.status, 'complete');
  assert.equal(ended.mode, 'break');
  const breakStarted = startTimer(ended, 2000000);
  assert.equal(breakStarted.endsAt, 2300000);
  const next = reconcileTimer(breakStarted, 2300000);
  assert.equal(next.mode, 'work');
  assert.equal(next.status, 'complete');
  assert.equal(next.remainingMs, 1500000);
});

test('reset and explicit switch stop the current session and respect custom duration', () => {
  const started = startTimer({ ...idle(), workMinutes: 42, breakMinutes: 7 }, 1000);
  const reset = resetTimer(pauseTimer(started, 5000));
  assert.equal(reset.status, 'idle');
  assert.equal(reset.remainingMs, 42 * 60000);
  assert.equal(reset.endsAt, null);
  assert.equal(reset.completedAt, null);
  const switched = advanceTimer(started, 5000);
  assert.equal(switched.status, 'idle');
  assert.equal(switched.mode, 'break');
  assert.equal(switched.remainingMs, 7 * 60000);
  assert.equal(switched.endsAt, null);
});

test('weather reuses matching cached reading for 30 minutes without a network call', async t => {
  t.mock.method(Date, 'now', () => 4000000);
  replaceGlobal(t, 'chrome', undefined);
  let calls = 0;
  replaceGlobal(t, 'fetch', async () => { calls++; throw new TypeError('offline'); });
  const cached = { cityKey, tempC: 11.25, code: 3, updatedAt: 4000000 - 29 * 60000 };
  assert.equal(await fetchWeather(city, cached), cached);
  assert.equal(calls, 0);
});

test('forced, expired, future, or other-city caches fetch valid real readings', async t => {
  t.mock.method(Date, 'now', () => 4000000);
  replaceGlobal(t, 'chrome', undefined);
  const requests = [];
  replaceGlobal(t, 'fetch', async (url, options) => {
    requests.push({ url, options });
    return response({ current: { temperature_2m: 14.75, weather_code: 61 } });
  });
  const cached = { cityKey, tempC: 11, code: 0, updatedAt: 4000000 };
  const fresh = await fetchWeather(city, cached, true);
  assert.deepEqual(fresh, { cityKey, tempC: 14.75, code: 61, updatedAt: 4000000 });
  await fetchWeather(city, { ...cached, updatedAt: 4000000 - 30 * 60000 });
  await fetchWeather(city, { ...cached, updatedAt: 4000001 });
  await fetchWeather(city, { ...cached, cityKey: '0,0' });
  assert.equal(requests.length, 4);
  const url = new URL(requests[0].url);
  assert.equal(url.hostname, 'api.open-meteo.com');
  assert.equal(url.searchParams.get('current'), 'temperature_2m,weather_code');
  assert.equal(url.searchParams.get('temperature_unit'), 'celsius');
  assert.equal(requests[0].options.credentials, 'omit');
  assert.equal(requests[0].options.referrerPolicy, 'no-referrer');
});

test('failed weather refresh rejects clearly and leaves stale cache untouched', async t => {
  replaceGlobal(t, 'chrome', undefined);
  replaceGlobal(t, 'fetch', async () => { throw new TypeError('network failure'); });
  const cache = { cityKey, tempC: 8, code: 3, updatedAt: 0 };
  const original = structuredClone(cache);
  await assert.rejects(fetchWeather(city, cache, true), /unavailable while offline/);
  assert.deepEqual(cache, original);
});

test('weather distinguishes HTTP errors, unusable readings, invalid coordinates, and empty city results', async t => {
  replaceGlobal(t, 'chrome', undefined);
  replaceGlobal(t, 'fetch', async () => ({ ok: false, status: 503 }));
  await assert.rejects(fetchWeather(city, null, true), /temporarily unavailable/);
  globalThis.fetch = async () => response({ current: { temperature_2m: null, weather_code: 0 } });
  await assert.rejects(fetchWeather(city, null, true), /unavailable reading/);
  globalThis.fetch = async () => response({ error: true });
  await assert.rejects(fetchWeather(city, null, true), /could not use this location/);
  await assert.rejects(fetchWeather({ ...city, latitude: 91 }), /valid weather location/);
  globalThis.fetch = async () => response({ results: [] });
  assert.deepEqual(await searchCities('Unknown city'), []);
  await assert.rejects(searchCities('A'), /at least two letters/);
});

test('weather timeout aborts the fetch and yields a plain language error', async t => {
  replaceGlobal(t, 'chrome', undefined);
  const originalSetTimeout = globalThis.setTimeout;
  let timeoutRequested;
  replaceGlobal(t, 'setTimeout', (callback, delay, ...args) => {
    timeoutRequested = delay;
    return originalSetTimeout(callback, 0, ...args);
  });
  replaceGlobal(t, 'fetch', async (url, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })), { once: true });
  }));
  await assert.rejects(fetchWeather(city, null, true), /took too long/);
  assert.equal(timeoutRequested, 10000);
});

test('city lookup encodes user text and maps only usable coordinates', async t => {
  replaceGlobal(t, 'chrome', undefined);
  let request;
  replaceGlobal(t, 'fetch', async url => {
    request = new URL(url);
    return response({ results: [
      { name: 'La Paz', admin1: 'La Paz', country: 'Bolivia', latitude: -16.5, longitude: -68.15 },
      { name: 'Invalid', latitude: null, longitude: 2 }
    ] });
  });
  const cities = await searchCities('La Paz & Bolivia');
  assert.equal(request.hostname, 'geocoding-api.open-meteo.com');
  assert.equal(request.searchParams.get('name'), 'La Paz & Bolivia');
  assert.deepEqual(cities, [{ ...city, label: 'La Paz, La Paz, Bolivia' }]);
});

test('extension does not transmit saved coordinates until weather host permission is granted', async t => {
  let requests = 0;
  let permissionRequests = 0;
  const origins = ['https://api.open-meteo.com/*', 'https://geocoding-api.open-meteo.com/*'];
  replaceGlobal(t, 'chrome', { runtime: { id: 'test-extension' }, permissions: {
    contains: async options => { assert.deepEqual(options.origins, origins); return false; },
    request: async options => { assert.deepEqual(options.origins, origins); permissionRequests++; return false; }
  } });
  replaceGlobal(t, 'fetch', async () => { requests++; return response({}); });
  assert.equal(await hasWeatherAccess(), false);
  await assert.rejects(fetchWeather(city, null, true), /Enable weather access/);
  await assert.rejects(searchCities('La Paz'), /Enable weather access/);
  assert.equal(requests, 0);
  assert.equal(permissionRequests, 0, 'reading weather never prompts permissions');
  assert.equal(await requestWeatherAccess(), false);
  assert.equal(permissionRequests, 1, 'explicit opt in requests only the declared weather hosts');
});

test('location uses a single low accuracy request and rounds coordinates', async t => {
  replaceGlobal(t, 'chrome', undefined);
  let options;
  let calls = 0;
  replaceGlobal(t, 'navigator', { geolocation: { getCurrentPosition: (success, failure, settings) => {
    calls++; options = settings; success({ coords: { latitude: -16.5001234, longitude: -68.1509876 } });
  } } });
  const result = await locateCity();
  assert.deepEqual(result, { name: 'Current location', label: 'Current location', latitude: -16.5, longitude: -68.151 });
  assert.equal(calls, 1);
  assert.equal(options.enableHighAccuracy, false);
  assert.equal(options.timeout, 10000);
});

test('weather labels cover WMO conditions shown to users', () => {
  assert.equal(weatherLabel(0), 'Clear sky');
  assert.equal(weatherLabel(3), 'Partly cloudy');
  assert.equal(weatherLabel(45), 'Fog');
  assert.equal(weatherLabel(53), 'Drizzle');
  assert.equal(weatherLabel(63), 'Rain');
  assert.equal(weatherLabel(75), 'Snow');
  assert.equal(weatherLabel(81), 'Rain showers');
  assert.equal(weatherLabel(86), 'Snow showers');
  assert.equal(weatherLabel(95), 'Thunderstorms');
});
