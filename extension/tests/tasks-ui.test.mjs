import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesTaskDate} from '../lib/tasks.js';

test('completed filtering follows completion state independently of task date',()=>{
  for(const dueDate of ['', '2026-10-03', '2026-10-04', '2026-10-05']){
    assert.equal(matchesTaskDate({dueDate,done:true},'completed','2026-10-04'),true);
    assert.equal(matchesTaskDate({dueDate,done:false},'completed','2026-10-04'),false);
  }
});
