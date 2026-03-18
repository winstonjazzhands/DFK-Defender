async function api(path, options) {
  const response = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) throw new Error(await response.text() || `HTTP ${response.status}`);
  return response.status === 204 ? null : response.json();
}

async function refreshWithdrawals() {
  const payload = await api('/api/admin/pending-withdrawals');
  const tbody = document.getElementById('withdrawals');
  tbody.innerHTML = '';
  for (const item of payload.withdrawals) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${item.id}</td><td>${item.user_id}</td><td>${item.amount_raw}</td><td>${item.to_address}</td><td><button data-id="${item.id}">Approve</button></td>`;
    tbody.appendChild(tr);
  }
  tbody.querySelectorAll('button[data-id]').forEach((button) => {
    button.addEventListener('click', async () => {
      await api(`/api/admin/withdrawals/${button.dataset.id}/approve`, { method: 'POST' });
      await refreshWithdrawals();
    });
  });
}

document.getElementById('loginBtn').addEventListener('click', async () => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const status = document.getElementById('loginStatus');
  try {
    await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    status.textContent = 'Logged in.';
    await refreshWithdrawals();
  } catch (error) {
    status.textContent = error.message;
  }
});
