import test from 'node:test';
import assert from 'node:assert/strict';
import {placeLink} from '../lib/sortable.js';
const links=()=>[{id:'a',folder:'',pinned:true},{id:'x',folder:'Other',pinned:false},{id:'b',folder:'',pinned:true},{id:'c',folder:'',pinned:true}];
test('Reordering pins keeps unpinned slots and their records intact',()=>{const items=links(),outside=items[1];placeLink(items,'a','c',true,{pinnedOnly:true});assert.deepEqual(items.map(l=>l.id),['b','x','c','a']);assert.equal(items[1],outside);placeLink(items,'a','b',false,{pinnedOnly:true});assert.deepEqual(items.map(l=>l.id),['a','x','b','c']);});
test('Links reorder within folders, reject stale IDs and leave other folders unchanged',()=>{const items=links();placeLink(items,'c','a');assert.deepEqual(items.map(l=>l.id),['c','x','a','b']);assert.throws(()=>placeLink(items,'a','x'),/same folder/);assert.throws(()=>placeLink(items,'missing','a'),/another tab/);assert.throws(()=>placeLink(items,'x','a',false,{pinnedOnly:true}),/no longer pinned/);placeLink(items,'a','a');assert.deepEqual(items.map(l=>l.id),['c','x','a','b']);});
