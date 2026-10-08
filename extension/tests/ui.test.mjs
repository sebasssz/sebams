import test from 'node:test';
import assert from 'node:assert/strict';
import {safeURL,moveItem} from '../lib/ui.js';

test('website addresses normalize HTTP and HTTPS without accepting executable schemes',()=>{
  assert.equal(safeURL(' example.org/path '),'https://example.org/path');
  assert.equal(safeURL('http://localhost:8080/'),'http://localhost:8080/');
  for(const value of ['javascript:alert(1)','data:text/html,<script>alert(1)</script>','file:///C:/private','chrome://settings','https://user:password@example.com/',''])assert.throws(()=>safeURL(value));
});
test('keyboard reorder preserves IDs and respects list bounds',()=>{
  const items=[{id:'a'},{id:'b'},{id:'c'}];
  moveItem(items,'b',-1);assert.deepEqual(items.map(i=>i.id),['b','a','c']);
  moveItem(items,'b',-1);moveItem(items,'missing',1);moveItem(items,'c',1);assert.deepEqual(items.map(i=>i.id),['b','a','c']);
  moveItem(items,'a',1);assert.deepEqual(items.map(i=>i.id),['b','c','a']);
});
