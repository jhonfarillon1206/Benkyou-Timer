<template>
  <div class="min-h-screen bg-slate-50 text-slate-800">
    <nav class="border-b border-slate-200 bg-white">
      <div class="mx-auto flex max-w-2xl gap-1 p-2">
        <RouterLink to="/" class="tab" active-class="tab-active"
          >Today</RouterLink
        >
        <RouterLink to="/history" class="tab" active-class="tab-active"
          >History</RouterLink
        >
      </div>
    </nav>
    <main class="mx-auto max-w-2xl p-4">
      <RouterView />
    </main>
  </div>
</template>

<style>
.tab {
  border-radius: 0.5rem;
  padding: 0.4rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #475569;
}
.tab-active {
  background: #eef2ff;
  color: #4338ca;
}
</style>