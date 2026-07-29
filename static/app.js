const result = document.querySelector('#result');
const statusText = document.querySelector('#status-text');
const mode = document.querySelector('#mode');

const levelTitle = { urgent: '需要立即注意', navigation: '导航提示', status: '状态提示' };

async function checkHealth() {
  const response = await fetch('/api/health');
  if (!response.ok) throw new Error('health unavailable');
  const health = await response.json();
  statusText.textContent = '系统就绪';
  mode.textContent = `${health.mode.toUpperCase()} MODE`;
}

async function sendObservation(payload) {
  const response = await fetch('/api/observations', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('observation rejected');
  return response.json();
}

document.querySelectorAll('[data-payload]').forEach((button) => {
  button.addEventListener('click', async () => {
    document.querySelectorAll('button').forEach((item) => item.disabled = true);
    try {
      const guidance = await sendObservation(JSON.parse(button.dataset.payload));
      result.className = `result ${guidance.level}`;
      result.innerHTML = `<p class="label">${levelTitle[guidance.level]}</p><h2>${guidance.message}</h2><p>${guidance.actionable ? '此提示通过置信度与重复提醒策略。' : '系统没有把此结果作为确定动作指令。'}</p>`;
    } catch {
      result.className = 'result neutral';
      result.innerHTML = '<p class="label">服务不可用</p><h2>无法获取提示</h2><p>请确认服务正在运行。</p>';
    } finally {
      document.querySelectorAll('button').forEach((item) => item.disabled = false);
    }
  });
});

checkHealth().catch(() => { statusText.textContent = '服务未连接'; });
