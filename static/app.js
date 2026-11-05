const result = document.querySelector('#result');
const statusText = document.querySelector('#status-text');
const mode = document.querySelector('#mode');
const history = document.querySelector('#history');
const fileInput = document.querySelector('#frame-file');
const preview = document.querySelector('#preview');
const still = document.querySelector('#still');
const snap = document.querySelector('#snap');
const cameraButton = document.querySelector('#use-camera');
const speakToggle = document.querySelector('#speak-toggle');

const levelTitle = { urgent: '需要立即注意', navigation: '导航提示', status: '状态提示' };
const actionableNote = '此提示通过置信度与重复提醒策略。';
const withheldNote = '系统没有把此结果作为确定动作指令。';

let cameraStream = null;
let stillUrl = '';

function renderResult(level, title, message, detail) {
  result.className = `result ${level}`;
  result.replaceChildren();
  const label = document.createElement('p');
  label.className = 'label';
  label.textContent = title;
  const heading = document.createElement('h2');
  heading.textContent = message;
  const note = document.createElement('p');
  note.textContent = detail;
  result.append(label, heading, note);
}

function showGuidance(guidance) {
  renderResult(
    guidance.level,
    levelTitle[guidance.level] || '状态提示',
    guidance.message,
    guidance.actionable ? actionableNote : withheldNote,
  );
}

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

function addHistory(event) {
  if (!event) return;
  if (history.textContent.includes('尚无提示事件')) history.replaceChildren();
  const item = document.createElement('li');
  item.textContent = `${event.level.toUpperCase()} · ${event.message}`;
  history.prepend(item);
}

function setBusy(busy) {
  document.querySelectorAll('button').forEach((item) => { item.disabled = busy; });
}

function speakIfEnabled(message) {
  if (!speakToggle.checked || !message || message === '相同提示已抑制。' || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = 'zh-CN';
    window.speechSynthesis.speak(utterance);
  } catch {
    // Browser speech is optional. The text result remains on the page.
  }
}

function rememberStill(blob) {
  if (stillUrl) URL.revokeObjectURL(stillUrl);
  stillUrl = URL.createObjectURL(blob);
  still.src = stillUrl;
  still.hidden = false;
  preview.hidden = true;
}

function stopCamera() {
  if (!cameraStream) return;
  cameraStream.getTracks().forEach((track) => track.stop());
  cameraStream = null;
  preview.srcObject = null;
  preview.hidden = true;
  cameraButton.textContent = '使用摄像头拍一帧';
}

async function analyzeBlob(blob) {
  setBusy(true);
  try {
    const response = await fetch('/api/vision/frame', {
      method: 'POST',
      headers: { 'content-type': blob.type || 'image/jpeg' },
      body: blob,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = typeof payload.detail === 'string' ? payload.detail : '请求被拒绝';
      renderResult('neutral', '无法分析', '没有产生引导', detail);
      return;
    }
    showGuidance(payload);
    addHistory(payload.event);
    speakIfEnabled(payload.message);
  } catch {
    renderResult('neutral', '服务不可用', '无法获取提示', '请确认服务正在运行。');
  } finally {
    setBusy(false);
  }
}

document.querySelectorAll('[data-payload]').forEach((button) => {
  button.addEventListener('click', async () => {
    stopCamera();
    setBusy(true);
    try {
      const guidance = await sendObservation(JSON.parse(button.dataset.payload));
      showGuidance(guidance);
      addHistory(guidance.event);
      speakIfEnabled(guidance.message);
    } catch {
      renderResult('neutral', '服务不可用', '无法获取提示', '请确认服务正在运行。');
    } finally {
      setBusy(false);
    }
  });
});

cameraButton.addEventListener('click', async () => {
  if (!cameraStream) {
    if (!navigator.mediaDevices?.getUserMedia) {
      renderResult('neutral', '无法使用摄像头', '这个浏览器没有提供摄像头接口', '可以选择一张图片继续试验。');
      return;
    }
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    } catch {
      try {
        cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      } catch {
        renderResult('neutral', '无法使用摄像头', '没有获得摄像头权限', '可以选择一张图片继续试验。');
        return;
      }
    }
    preview.srcObject = cameraStream;
    preview.hidden = false;
    still.hidden = true;
    cameraButton.textContent = '分析当前画面';
    return;
  }
  const width = preview.videoWidth || 640;
  const height = preview.videoHeight || 480;
  snap.width = width;
  snap.height = height;
  snap.getContext('2d').drawImage(preview, 0, 0, width, height);
  const blob = await new Promise((resolve) => snap.toBlob(resolve, 'image/jpeg', 0.92));
  stopCamera();
  if (!blob) {
    renderResult('neutral', '无法分析', '没有得到画面', '请再试一次，或选择一张图片。');
    return;
  }
  rememberStill(blob);
  await analyzeBlob(blob);
});

document.querySelector('#choose-image').addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => {
  const file = fileInput.files && fileInput.files[0];
  fileInput.value = '';
  if (!file) return;
  stopCamera();
  rememberStill(file);
  analyzeBlob(file);
});

checkHealth().catch(() => { statusText.textContent = '服务未连接'; });
