import {OPEN_REMINDER_DEFAULTS} from '../lib/reminders.js';
import {PRODUCT_DEFAULTS} from '../lib/model.js';
import {TASK_EXTRA_DEFAULTS} from '../lib/planner.js';
export function stripProduct(state){for(const key of Object.keys({...PRODUCT_DEFAULTS,...OPEN_REMINDER_DEFAULTS}))delete state.prefs[key];for(const w of Object.values(state.workspaces)){delete w.templates;delete w.exams;for(const t of w.tasks)for(const key of Object.keys(TASK_EXTRA_DEFAULTS))delete t[key];}return state;}
