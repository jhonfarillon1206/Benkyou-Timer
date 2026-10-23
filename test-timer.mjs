import assert from 'node:assert'
import { createActivity, start, pause, sync, stop, getRemainingMs, STATUS } from './src/lib/timer.js'

const MIN = 60 * 1000
const T0 = 1_000_000_000_000

// Your example: 60 min, start, pause after 25 -> 35 left
let a = createActivity({ subject: 'Kanji', title: 'Kanji Study', date: '2026-10-23', targetMin: 60 })
a = start(a, T0)
a = pause(a, T0 + 25 * MIN)
assert.equal(a.status, STATUS.PAUSED)
assert.equal(getRemainingMs(a, T0 + 25 * MIN), 35 * MIN)

// Closed for 5 hours while paused -> still 35
assert.equal(getRemainingMs(a, T0 + 5 * 60 * MIN), 35 * MIN)
assert.equal(a.pauseCount, 1)

// Resume, reopen 10 min later while running -> 25 left
const T1 = T0 + 6 * 60 * MIN
a = start(a, T1)
assert.equal(getRemainingMs(a, T1 + 10 * MIN), 25 * MIN)

// Stay closed past the end -> completes, endedAt = exact finish time
const done = sync(a, T1 + 3 * 60 * MIN)
assert.equal(done.status, STATUS.COMPLETED)
assert.equal(done.endedAt, T1 + 35 * MIN)

// Stop early while running
const stopped = stop(a, T1 + 10 * MIN)
assert.equal(stopped.status, STATUS.STOPPED)
assert.equal(stopped.remainingMs, 25 * MIN)

console.log('All timer tests passed')