export function todayStr(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
export function addDays(str, n) {
  const [y, m, d] = str.split('-').map(Number)
  return todayStr(new Date(y, m - 1, d + n))
}