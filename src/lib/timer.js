import { todayStr } from './date.js'

export const STATUS = {
  IDLE: 'idle',
  RUNNING: 'running',
  PAUSED: 'paused',
  COMPLETED: 'completed', // reached target
  STOPPED: 'stopped',     // ended early
}

export function createActivity({ subject, title, date, time = '', targetMin }) {
  const targetMs = targetMin * 60 * 1000
  return {
    id: crypto.randomUUID(),
    subject,
    title,
    date,            // 'YYYY-MM-DD'
    time,            // optional 'HH:mm'
    targetMs,
    remainingMs: targetMs,
    status: STATUS.IDLE,
    startedAt: null,   // epoch ms of the last Start/Resume (only while running)
    sessionStart: null, // epoch ms of the very first Start
    endedAt: null,
    pauseCount: 0,
    createdAt: Date.now(),
  }
}

// Remaining time, derived from timestamps. Never from counting ticks.
export function getRemainingMs(a, now = Date.now()) {
  if (a.status === STATUS.RUNNING) {
    return Math.max(0, a.remainingMs - (now - a.startedAt))
  }
  return a.remainingMs
}

export function getStudiedMs(a, now = Date.now()) {
  return a.targetMs - getRemainingMs(a, now)
}

// Call on app load and on every tick. Completes a timer that ran out,
// even if the app was closed when it did.
export function sync(a, now = Date.now()) {
  if (a.status === STATUS.RUNNING && now - a.startedAt >= a.remainingMs) {
    return {
      ...a,
      status: STATUS.COMPLETED,
      endedAt: a.startedAt + a.remainingMs, // when it actually hit zero
      remainingMs: 0,
      startedAt: null,
    }
  }
  return a
}

export function start(a, now = Date.now()) {
  if (a.status !== STATUS.IDLE && a.status !== STATUS.PAUSED) return a
  return {
    ...a,
    status: STATUS.RUNNING,
    startedAt: now,
    sessionStart: a.sessionStart ?? now,
  }
}

export function pause(a, now = Date.now()) {
  if (a.status !== STATUS.RUNNING) return a
  return {
    ...a,
    status: STATUS.PAUSED,
    remainingMs: getRemainingMs(a, now),
    startedAt: null,
    pauseCount: a.pauseCount + 1,
  }
}

// Stop early: keeps the studied time, ends the session.
export function stop(a, now = Date.now()) {
  if (a.status !== STATUS.RUNNING && a.status !== STATUS.PAUSED) return a
  return {
    ...a,
    status: STATUS.STOPPED,
    remainingMs: getRemainingMs(a, now),
    startedAt: null,
    endedAt: now,
  }
}

export function reset(a) {
  return {
    ...a,
    status: STATUS.IDLE,
    remainingMs: a.targetMs,
    startedAt: null,
    sessionStart: null,
    endedAt: null,
    pauseCount: 0,
  }
}

export function formatMs(ms) {
  const total = Math.ceil(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

// Only allowed while idle, since changing the target mid-session would corrupt the timer.
export function updateDetails(a, { subject, title, targetMin }) {
  if (a.status !== STATUS.IDLE) return a
  const targetMs = targetMin * 60 * 1000
  return { ...a, subject, title, targetMs, remainingMs: targetMs }
}

// Builds the history record for a finished or interrupted run.
export function toSession(a, now = Date.now()) {
  return {
    id: `${a.id}-${a.sessionStart}`,
    activityId: a.id,
    subject: a.subject,
    title: a.title,
    date: todayStr(new Date(a.sessionStart)), // the day it was studied
    startTs: a.sessionStart,
    endTs: a.endedAt ?? now,
    studiedMs: getStudiedMs(a, now),
    pauseCount: a.pauseCount,
    outcome: a.status === STATUS.COMPLETED ? 'completed' : 'interrupted',
  }
}