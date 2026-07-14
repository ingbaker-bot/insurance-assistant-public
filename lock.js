// ══════════════════════════════════════════════════════
// lock.js — PIN 鎖定畫面 + 刪除保單橋接函式（ES Module）
// 原本位於 index.html 第 5844–6151 行，拆分示範
// 依賴（來自尚未拆分的其他區塊，皆為全域變數/函式，載入順序已確保先於本模組執行）：
//   currentPolicyData, showBdToast, closeModalOrBack, loadExpiringLists,
//   _directShellUrl, directGasCall, gasCall
// ══════════════════════════════════════════════════════

// ══════════════════════════════════════════════
// ★ v7.3 鎖定畫面邏輯
// PIN 碼 4 位數、閒置 10 分鐘自動鎖定、支援生物辨識
// ══════════════════════════════════════════════
var _lockPin       = '';         // 目前輸入中的 PIN
var _savedPin      = null;       // 已儲存的 PIN
var _isSetupMode   = false;      // 是否正在設定新 PIN
var _setupFirst    = '';         // 設定時第一次輸入
var _idleTimer     = null;       // 閒置計時器
var _IDLE_MS       = 10 * 60 * 1000;  // 10 分鐘
var _bioAvailable  = false;      // 生物辨識是否可用
var _bioCredId     = null;       // 生物辨識 credential ID

// ── 初始化鎖定系統 ──
function _lockInit() {
  _savedPin = localStorage.getItem('nbs_pin');

  // 檢查生物辨識
  _lockCheckBio();

  if (!_savedPin) {
    // 首次使用：進入設定 PIN 模式
    _isSetupMode = true;
    _setupFirst  = '';
    document.getElementById('lockSubtitle').textContent = '首次使用，請設定 PIN 碼';
  } else {
    document.getElementById('lockSetupHint').style.display = 'block';
  }
}

// ── 生物辨識檢查 ──
async function _lockCheckBio() {
  try {
    if (!window.PublicKeyCredential) return;
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    if (!available) return;
    _bioAvailable = true;
    document.getElementById('bioBtn').style.display = 'flex';

    // 若已儲存 credential，自動嘗試生物辨識
    var credId = localStorage.getItem('nbs_bio_cred');
    if (credId && _savedPin) {
      setTimeout(_lockBio, 500); // 稍微延遲，讓畫面先顯示
    }
  } catch(e) {}
}

// ── 生物辨識驗證 ──
async function _lockBio() {
  if (!_bioAvailable || !_savedPin) {
    if (!_savedPin) { _lockSetupPrompt(); return; }
    return;
  }
  try {
    var credId = localStorage.getItem('nbs_bio_cred');
    var getOpts = {
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        timeout: 60000,
        userVerification: 'required',
        allowCredentials: credId ? [{
          id: Uint8Array.from(atob(credId), c => c.charCodeAt(0)),
          type: 'public-key'
        }] : []
      }
    };
    await navigator.credentials.get(getOpts);
    _lockUnlock();
  } catch(e) {
    // 生物辨識失敗或取消，不顯示錯誤（讓用戶用 PIN）
  }
}

// ── 按鍵輸入 ──
function _lockKey(digit) {
  if (_lockPin.length >= 4) return;
  _lockPin += digit;
  _lockUpdateDots();
  document.getElementById('lockError').textContent = '';

  if (_lockPin.length === 4) {
    setTimeout(_lockSubmit, 150);
  }
}

function _lockDel() {
  _lockPin = _lockPin.slice(0, -1);
  _lockUpdateDots();
}

function _lockUpdateDots() {
  for (var i = 0; i < 4; i++) {
    var dot = document.getElementById('dot' + i);
    dot.classList.toggle('filled', i < _lockPin.length);
  }
}

// ── 提交 PIN ──
function _lockSubmit() {
  if (_isSetupMode) {
    // 設定模式
    if (!_setupFirst) {
      _setupFirst = _lockPin;
      _lockPin = '';
      _lockUpdateDots();
      document.getElementById('lockSubtitle').textContent = '請再輸入一次確認';
    } else {
      if (_lockPin === _setupFirst) {
        localStorage.setItem('nbs_pin', _lockPin);
        _savedPin = _lockPin;
        _isSetupMode = false;
        _setupFirst  = '';
        document.getElementById('lockSubtitle').textContent = '請輸入 PIN 碼';
        document.getElementById('lockSetupHint').style.display = 'block';

        // 設定完成後詢問是否啟用生物辨識
        if (_bioAvailable) {
          setTimeout(_lockRegisterBio, 300);
        } else {
          _lockUnlock();
        }
      } else {
        _lockPin = '';
        _setupFirst = '';
        _lockUpdateDots();
        document.getElementById('lockError').textContent = '兩次輸入不一致，請重新設定';
        document.getElementById('lockSubtitle').textContent = '首次使用，請設定 PIN 碼';
      }
    }
  } else {
    // 驗證模式
    if (_lockPin === _savedPin) {
      _lockUnlock();
    } else {
      _lockPin = '';
      _lockUpdateDots();
      document.getElementById('lockError').textContent = 'PIN 碼錯誤，請重試';
      // 輕微震動提示
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    }
  }
}

// ── 解鎖 ──
function _lockUnlock() {
  document.getElementById('lockScreen').style.display = 'none';
  document.getElementById('lockError').textContent = '';
  _lockPin = '';
  _lockUpdateDots();
  _lockResetIdle();
}

// ── 鎖定 ──
function _lockLock() {
  _lockPin = '';
  _lockUpdateDots();
  document.getElementById('lockScreen').style.display = 'flex';
  document.getElementById('lockSubtitle').textContent = '請輸入 PIN 碼';
  document.getElementById('lockError').textContent = '';
  clearTimeout(_idleTimer);

  // 自動嘗試生物辨識
  if (_bioAvailable && localStorage.getItem('nbs_bio_cred')) {
    setTimeout(_lockBio, 400);
  }
}

// ── 閒置計時器 ──
function _lockResetIdle() {
  clearTimeout(_idleTimer);
  _idleTimer = setTimeout(function() {
    if (document.getElementById('lockScreen').style.display === 'none') {
      _lockLock();
    }
  }, _IDLE_MS);
}

// 監聽使用者活動，重置閒置計時器
['click','touchstart','keydown','scroll'].forEach(function(evt) {
  document.addEventListener(evt, function() {
    if (document.getElementById('lockScreen').style.display === 'none') {
      _lockResetIdle();
    }
  }, { passive: true });
});

// ★ 2026/07 新增：鎖定畫面顯示時，支援用實體鍵盤輸入 PIN 碼
// （電腦版用滑鼠點畫面數字鍵不方便，改用鍵盤 0-9 與 Backspace）
document.addEventListener('keydown', function(e) {
  if (document.getElementById('lockScreen').style.display === 'none') return;
  if (e.key >= '0' && e.key <= '9') {
    _lockKey(e.key);
    e.preventDefault();
  } else if (e.key === 'Backspace' || e.key === 'Delete') {
    _lockDel();
    e.preventDefault();
  }
});

// 頁面重新可見時（從背景切回）也檢查
var _hiddenAt = null;  // ★ 記錄畫面被切走(分頁隱藏)的時間點

document.addEventListener('visibilitychange', function() {
  if (document.hidden) {
    _hiddenAt = Date.now();
  } else if (_savedPin) {
    // 只有離開超過 _IDLE_MS（跟閒置自動鎖定同一個門檻）才重新鎖定，
    // 短暫切到別的分頁（例如複製貼上）再切回來不會鎖住
    if (_hiddenAt !== null && (Date.now() - _hiddenAt) >= _IDLE_MS) {
      _lockLock();
    } else {
      _lockResetIdle();
    }
    _hiddenAt = null;
  }
});

// ── 重新設定 PIN ──
function _lockSetupPrompt() {
  var ok = confirm('確定要重新設定 PIN 碼？');
  if (!ok) return;
  _isSetupMode = true;
  _setupFirst  = '';
  _lockPin     = '';
  _lockUpdateDots();
  document.getElementById('lockSubtitle').textContent = '請設定新的 PIN 碼';
  document.getElementById('lockError').textContent = '';
}

// ── 生物辨識註冊 ──
async function _lockRegisterBio() {
  var wantBio = confirm('是否啟用指紋 / Face ID 快速解鎖？');
  if (!wantBio) { _lockUnlock(); return; }
  try {
    var cred = await navigator.credentials.create({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rp: { name: 'NBS 產險特助', id: location.hostname },
        user: {
          id: new Uint8Array(16),
          name: 'nbs_user',
          displayName: 'NBS 業務員'
        },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required'
        },
        timeout: 60000
      }
    });
    var credId = btoa(String.fromCharCode(...new Uint8Array(cred.rawId)));
    localStorage.setItem('nbs_bio_cred', credId);
    _bioCredId = credId;
    alert('✅ 生物辨識設定完成！');
  } catch(e) {
    // 取消或失敗，只用 PIN
  }
  _lockUnlock();
}

// ── 啟動 ──
document.addEventListener('DOMContentLoaded', function() {
  _lockInit();
});

// ★ 全域橋接函式：第一層主頁按鈕呼叫此函式
//   實際邏輯在主 script 閉包內的 _openCarMapFromModal
// ★ v6.6 刪除保單相關函式
var _deletePolicyNo = '';  // 暫存待刪除的保單號碼

function confirmDeletePolicy() {
  if (!currentPolicyData || !currentPolicyData.main) {
    alert('請先開啟一張保單');
    return;
  }
  var main = currentPolicyData.main;
  var pno  = main.policyNo || main.no || '';
  if (!pno) {
    alert('無法取得保單號碼');
    return;
  }
  _deletePolicyNo = pno;

  // 填入確認 Modal 的保單資訊
  document.getElementById('delModalPolicyNo').textContent  = '保單號碼：' + pno;
  document.getElementById('delModalPolicyInfo').textContent =
    (main.insuredName || '') + '　' + (main.type || '') + '　' + (main.expiry || main.expiryDate || '');

  document.getElementById('deletePolicyModal').style.display = 'flex';
}

function cancelDeletePolicy() {
  document.getElementById('deletePolicyModal').style.display = 'none';
  _deletePolicyNo = '';
}

function executeDeletePolicy() {
  if (!_deletePolicyNo) return;
  var pno = _deletePolicyNo;

  // 關閉確認 Modal，顯示載入中
  document.getElementById('deletePolicyModal').style.display = 'none';
  document.getElementById('loading').style.display = 'block';

  var onOk = function(result) {
    document.getElementById('loading').style.display = 'none';
    if (result && result.success) {
      showBdToast('✅ ' + result.msg);
      closeModalOrBack();
      // 若目前在到期提醒列表，刷新對應列表
      if (typeof loadExpiringLists === 'function') {
        setTimeout(loadExpiringLists, 500);
      }
    } else {
      alert('⚠️ 刪除失敗：' + (result ? result.msg : '未知錯誤'));
    }
    _deletePolicyNo = '';
  };
  var onErr = function() {
    document.getElementById('loading').style.display = 'none';
    alert('⚠️ 網路錯誤，請重試');
    _deletePolicyNo = '';
  };

  if (_directShellUrl) {
    directGasCall('deletePolicy', { policyNo: pno }, onOk, onErr);
  } else {
    gasCall('deletePolicy', { policyNo: pno }, onOk, onErr);
  }
}

// ══════════════════════════════════════════════════════
// ★ 把 index.html 內 onclick="..." 會呼叫到的函式 expose 到全域
// ══════════════════════════════════════════════════════
window._lockKey            = _lockKey;
window._lockDel             = _lockDel;
window._lockSetupPrompt     = _lockSetupPrompt;
window._lockBio              = _lockBio;
window.confirmDeletePolicy  = confirmDeletePolicy;
window.cancelDeletePolicy   = cancelDeletePolicy;
window.executeDeletePolicy  = executeDeletePolicy;
