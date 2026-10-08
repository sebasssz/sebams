export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'value') node.value = value;
    else if (key === 'checked') node.checked = value;
    else if (value !== false && value != null) node.setAttribute(key, value === true ? '' : value);
  }
  children.flat().forEach(child => { if (child != null) node.append(child instanceof Node ? child : document.createTextNode(String(child))); });
  return node;
}
export function icon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `#i-${name}`); svg.append(use); return svg;
}
export const $ = id => document.getElementById(id);
export const uid = () => crypto.randomUUID();
export function safeURL(value) {
  const trimmed = value.trim();
  const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`);
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) throw new Error('Use a website address beginning with https:// or http://, without a username or password.');
  return url.href;
}
export function moveItem(items, id, direction, matches = () => true) {
  const indexes = items.flatMap((item, index) => matches(item) ? [index] : []);
  const index = items.findIndex(item => item.id === id), position = indexes.indexOf(index), next = indexes[position + direction];
  if (position >= 0 && next !== undefined) [items[index], items[next]] = [items[next], items[index]];
}
export function downloadJSON(value, name) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const a = el('a', { href: url, download: name }); a.click(); setTimeout(() => URL.revokeObjectURL(url), 2000);
}
