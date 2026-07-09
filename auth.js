// ══════════════════════════════════════════════════════
// auth.js — 登入、GAS 連線（ES Module）★ 全站核心基礎設施 ★
// 原本位於 index.html 第 800–1253 行，拆分示範
// 這是全站耦合度最高的模組：gasCall／directGasCall 被其他 9 個
// 模組全部呼叫，是最後、也是風險最高的一個，請務必依照下方測試
// 重點完整測試一輪。
//
// ★ 重要：以下 6 個變數原本用 var 宣告，但因為被其他模組或尚未拆分
//   的程式碼直接讀寫，改成明確的 window.X 屬性，避免模組化後
//   變成「只有這個模組自己看得到」而跟其他地方的狀態脫鉤：
//   _prefetchedTasks, currentPolicyData, currentTravelData,
//   ADVISOR_NAME, ADVISOR_LINE, currentTab
// ══════════════════════════════════════════════════════

<script>
  // ══════════════════════════════════════════════════════
  // ★ GAS API 設定
  // 填入 Libcode GAS 專案的部署 URL（只需要填一次，永久不變）
  // 業務員新增/重新部署 Shell 時，只需更新授權名單 Sheets 的 E 欄即可
  // ══════════════════════════════════════════════════════
  var GAS_API_URL = 'https://script.google.com/macros/s/AKfycbzWMcDK9reNaiuyYYh568eFRNgMFVsMCRUWxOCy_7-w1sOgU-J_A61k3of8Cve7-_gf/exec';

  // ══════════════════════════════════════════════════════
  // ★ 測試模式（正式上線前可暫時使用，填入業務員 email 跳過 Google 登入）
  // 正式使用時把 TEST_EMAIL 改回空字串 ''
  // ══════════════════════════════════════════════════════
  var TEST_EMAIL = ''; // 測試模式：填入 email 可跳過登入，正式使用請保持空字串

  // ★ 短網址用：中央授權名單後端（即 LIBCODE_URL_，需支援 action=getShell&code=xxx）
  var SHORT_CODE_LOOKUP_URL = 'https://script.google.com/macros/s/AKfycbzWMcDK9reNaiuyYYh568eFRNgMFVsMCRUWxOCy_7-w1sOgU-J_A61k3of8Cve7-_gf/exec'; // ★正式 LIBCODE_URL_

  // ══════════════════════════════════════════════════════
  // ★ 授權狀態（Google 登入後取得）
  // ══════════════════════════════════════════════════════
  window._directShellUrl = null;  // ★ 最關鍵的跨模組共用變數，全部10個模組都靠它判斷路由
  var _userEmail = '';
  var _gasCallSeq      = 0;
  window._prefetchedTasks = null;  // ★ 代辦清單預載暫存（跨模組共用，明確用window，見下方說明）

  // JSONP 呼叫 GAS API（帶 email 做授權）
  function gasCall(action, params, successFn, failFn, timeout) {
    var cbName = '_gasCb_' + (++_gasCallSeq);
    var timer = null;
    var done  = false;
    window[cbName] = function(data) {
      if (done) return; done = true;
      clearTimeout(timer);
      var el = document.getElementById(cbName); if (el) el.parentNode.removeChild(el);
      delete window[cbName];
      // 授權失敗 → 重新顯示登入畫面
      if (data && data.error === 'unauthorized') {
        document.getElementById('authStatus').textContent = '⛔ ' + data.msg;
        document.getElementById('authOverlay').style.display = 'flex';
        _userEmail = '';
        return;
      }
      if (successFn) successFn(data);
    };
    timer = setTimeout(function() {
      if (done) return; done = true;
      var el = document.getElementById(cbName); if (el) el.parentNode.removeChild(el);
      delete window[cbName];
      console.error('[gasCall timeout] ' + action);
      if (failFn) failFn(new Error('timeout'));
    }, timeout || 25000);
    var url = GAS_API_URL + '?action=' + encodeURIComponent(action) + '&callback=' + cbName + '&email=' + encodeURIComponent(_userEmail);
    if (params) Object.keys(params).forEach(function(k) {
      url += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k] !== undefined ? params[k] : '');
    });
    var script = document.createElement('script');
    script.id = cbName; script.src = url;
    script.onerror = function() {
      if (done) return; done = true;
      clearTimeout(timer);
      var el = document.getElementById(cbName); if (el) el.parentNode.removeChild(el);
      delete window[cbName];
      if (failFn) failFn(new Error('script error'));
    };
    document.head.appendChild(script);
  }

  // ══════════════════════════════════════════════════════
  // ★ Google Identity Services 登入流程
  // ══════════════════════════════════════════════════════
  // Google Client ID（需在 Google Cloud Console 建立）
  var GOOGLE_CLIENT_ID = '524622074888-i2o91rammkos6u1suh39gu1gia59v6sm.apps.googleusercontent.com';

  // ══════════════════════════════════════════════════════
  // ★ 登入狀態快取（存在 localStorage，避免每次都要點選）
  // ══════════════════════════════════════════════════════
  var CACHE_KEY     = 'ins_user_email';
  var CACHE_EXPIRY  = 'ins_user_expiry';
  var CACHE_HOURS   = 24; // 24小時內自動登入，每次開啟都重新計時

  // 遮罩淡出（加入動畫，視覺更順暢）
  function hideAuthOverlay() {
    var overlay = document.getElementById('authOverlay');
    overlay.classList.add('hiding');
    setTimeout(function() { overlay.style.display = 'none'; }, 400);
  }

  function saveLoginCache(email) {
    try {
      localStorage.setItem(CACHE_KEY,    email);
      localStorage.setItem(CACHE_EXPIRY, Date.now() + CACHE_HOURS * 3600 * 1000);
    } catch(e) {}
  }

  function loadLoginCache() {
    try {
      var expiry = parseInt(localStorage.getItem(CACHE_EXPIRY) || '0');
      if (Date.now() > expiry) { localStorage.removeItem(CACHE_KEY); return ''; }
      var email = localStorage.getItem(CACHE_KEY) || '';
      // ★ 每次開啟都重新延長24小時（只要有進入，時間就重新計算）
      if (email) localStorage.setItem(CACHE_EXPIRY, Date.now() + CACHE_HOURS * 3600 * 1000);
      return email;
    } catch(e) { return ''; }
  }

  function clearLoginCache() {
    try { localStorage.removeItem(CACHE_KEY); localStorage.removeItem(CACHE_EXPIRY); } catch(e) {}
  }

  function initGoogleSignIn() {
    // ── 【直連強效檢查：確保 100% 0秒繞過 Google 登入】 ──
    var urlParams = new URLSearchParams(window.location.search);
    var tokenUrl  = urlParams.get('shell');

    // ★ 短網址模式：網址列只有 ?u=短碼，實際 shell 網址向中央後端查詢取得，不會出現在網址列
    var shortCode = urlParams.get('u');
    if (shortCode && !tokenUrl) {
      fetch(SHORT_CODE_LOOKUP_URL + '?action=getShell&code=' + encodeURIComponent(shortCode))
        .then(function(res) { return res.json(); })
        .then(function(data) {
          if (data && data.success && data.shellUrl) {
            window._directShellUrl = data.shellUrl;
            var overlay = document.getElementById('authOverlay');
            if (overlay) { overlay.style.display = 'none'; overlay.classList.add('hiding'); }
            _userEmail = 'direct_token_user';
            initDirectSystem();
          } else {
            console.error('短碼查無對應帳號，改用一般登入流程', data);
            startGoogleSignIn();
          }
        })
        .catch(function(err) {
          console.error('短碼查詢失敗，改用一般登入流程', err);
          startGoogleSignIn();
        });
      return; // 已改用非同步流程處理，等待查詢結果回來
    }

    if (tokenUrl) {
      try {
        // ★ v7.3 Edge 相容性修正：多層解碼 fallback
        var decodedString = '';
        // 方法1：標準 decodeURIComponent + atob
        try {
          decodedString = atob(decodeURIComponent(tokenUrl));
        } catch(e1) {
          // 方法2：直接 atob（有些瀏覽器 tokenUrl 已不需要 decodeURIComponent）
          try {
            decodedString = atob(tokenUrl);
          } catch(e2) {
            // 方法3：先處理 base64url 格式（+ → +, / → /, padding）
            try {
              var b64 = tokenUrl.replace(/-/g,'+').replace(/_/g,'/');
              while (b64.length % 4) b64 += '=';
              decodedString = atob(b64);
            } catch(e3) {
              console.error('Shell URL 解碼全部失敗', e1, e2, e3);
            }
          }
        }

        if (decodedString && decodedString.indexOf('https://script.google.com/') !== -1) {
          window._directShellUrl = decodedString;

          var overlay = document.getElementById('authOverlay');
          if (overlay) {
            overlay.style.display = 'none';
            overlay.classList.add('hiding');
          }

          _userEmail = 'direct_token_user';
          initDirectSystem();
          return;
        }
      } catch(e) {
        console.error('捷徑網址解析失敗，原因：', e);
      }
    }

    // ── 以下維持您原本的傳統登入流程與快取機制 (作為後備方案) ──
    if (TEST_EMAIL) {
      _userEmail = TEST_EMAIL;
      hideAuthOverlay();
      window.ADVISOR_NAME = TEST_EMAIL.split('@')[0];
      gasCall('getSystemConfig', {}, function(cfg) {
        if (cfg && !cfg.error) {
          if (cfg['顧問姓名']) window.ADVISOR_NAME = cfg['顧問姓名'];
          if (cfg['顧問LINE'])  window.ADVISOR_LINE = cfg['顧問LINE'];
          if (cfg && cfg['顧問電話'])  ADVISOR_PHONE = cfg['顧問電話'];
        }
        initSystem();
      }, function() { initSystem(); });
      return;
    }

    var cachedEmail = loadLoginCache();
    if (cachedEmail) {
      _userEmail = cachedEmail;
      document.getElementById('autoLoginSpinner').style.display = 'block';
      document.getElementById('loginPanel').style.display = 'none';
      document.getElementById('authStatus').textContent = '';
      gasCall('getSystemConfig', {}, function(cfg) {
        if (cfg && (cfg.error === 'unauthorized' || cfg.error === 'no_shell_url')) {
          clearLoginCache();
          _userEmail = '';
          document.getElementById('authStatus').textContent = '請重新登入';
          startGoogleSignIn();
          return;
        }
        hideAuthOverlay();
        if (cfg && cfg['顧問姓名']) window.ADVISOR_NAME = cfg['顧問姓名'];
        if (cfg && cfg['顧問LINE'])  window.ADVISOR_LINE = cfg['顧問LINE'];
        if (cfg && cfg['顧問電話'])  ADVISOR_PHONE = cfg['顧問電話'];
        initSystem();
      }, function() {
        hideAuthOverlay();
        initSystem();
      });
      return;
    }

    startGoogleSignIn();
  }

  // ── 【直連模式新增：繞過中央直接向個人薄殼讀取到期資料】 ──
  function initDirectSystem() {
    // ★ v7.1 三個請求同時發出，共用同一次 GAS 冷啟動
    var hint = document.getElementById('expiryLoadingHint');
    var cfgDone = false, listDone = false;
    var expiryResult = null;

    // 請求1：系統設定
    directGasCall('getSystemConfig', {}, function(cfg) {
      if (cfg && cfg['顧問姓名']) window.ADVISOR_NAME  = cfg['顧問姓名'];
      if (cfg && cfg['顧問LINE'])  window.ADVISOR_LINE  = cfg['顧問LINE'];
      if (cfg && cfg['顧問電話'])  ADVISOR_PHONE = cfg['顧問電話'];
      cfgDone = true;
      if (listDone) _applyExpiryResult(expiryResult, hint);
    }, function() {
      cfgDone = true;
      if (listDone) _applyExpiryResult(expiryResult, hint);
    });

    // 請求2：到期名單
    directGasCall('getExpiringLists', {}, function(result) {
      expiryResult = result;
      listDone = true;
      if (cfgDone) _applyExpiryResult(expiryResult, hint);
    }, function() {
      listDone = true;
      if (cfgDone) _applyExpiryResult(null, hint);
    });

    // ★ 請求3：代辦清單預載（背景靜默，不影響主畫面）
    directGasCall('getTasks', {}, function(result) {
      window._prefetchedTasks = result;
    }, null);
  }

  function _applyExpiryResult(result, hint) {
    if (hint) hint.style.display = 'none';
    var hasUrgent  = result && result.urgent  && result.urgent.length  > 0;
    var hasWarning = result && result.warning && result.warning.length > 0;
    if (!hasUrgent && !hasWarning) {
      document.getElementById('expiryAlertArea').innerHTML =
        '<div style="background:#E8F5E9;border:1px solid #A5D6A7;border-radius:8px;padding:10px 14px;margin-bottom:8px;font-size:13px;color:#2E7D32;">✅ 目前無即將到期保單</div>';
      return;
    }
    if (hasUrgent)  renderExpiryAlert(result.urgent);
    if (hasWarning) renderEarlyWarning(result.warning);
  }

  // ── 【直連模式新增：專用 JSONP 輕量化請求】 ──
  // ★ v7.3 directGasCall：JSONP 優先，Edge/Safari 自動 fallback 到 fetch
  var _useJsonp = null; // null=未知, true=用JSONP, false=用fetch

  function directGasCall(action, params, successFn, failFn) {
    // 若已確認 fetch 可用（Edge 模式），直接走 fetch
    if (_useJsonp === false) {
      _directGasCallFetch(action, params, successFn, failFn);
      return;
    }
    _directGasCallJsonp(action, params, successFn, failFn);
  }

  // JSONP 方式
  function _directGasCallJsonp(action, params, successFn, failFn) {
    var cbName = '_dirCb_' + (++_gasCallSeq);
    var done   = false;
    var timer  = setTimeout(function() {
      if (done) return; done = true;
      var el = document.getElementById(cbName); if (el) el.parentNode.removeChild(el);
      delete window[cbName];
      console.warn('[directGasCall jsonp timeout] ' + action + '，嘗試 fetch 模式');
      // timeout 時嘗試 fetch fallback
      _directGasCallFetch(action, params, function(data) {
        _useJsonp = false; // 確認 fetch 有效，之後都用 fetch
        if (successFn) successFn(data);
      }, failFn);
    }, 15000);

    window[cbName] = function(data) {
      if (done) return; done = true;
      clearTimeout(timer);
      var el = document.getElementById(cbName); if (el) el.parentNode.removeChild(el);
      delete window[cbName];
      _useJsonp = true; // 確認 JSONP 有效
      if (successFn) successFn(data);
    };

    var url = _directShellUrl + '?action=' + encodeURIComponent(action) + '&callback=' + cbName;
    if (params) Object.keys(params).forEach(function(k) {
      url += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k] !== undefined ? params[k] : '');
    });

    var script = document.createElement('script');
    script.id  = cbName;
    script.src = url;
    script.onerror = function() {
      if (done) return; done = true;
      clearTimeout(timer);
      var el = document.getElementById(cbName); if (el) el.parentNode.removeChild(el);
      delete window[cbName];
      console.warn('[directGasCall jsonp error] ' + action + '，改用 fetch 模式');
      // JSONP 失敗（Edge/Safari CSP）→ 立即 fallback 到 fetch
      _directGasCallFetch(action, params, function(data) {
        _useJsonp = false; // 記住此瀏覽器要用 fetch
        if (successFn) successFn(data);
      }, failFn);
    };
    document.head.appendChild(script);
  }

  // fetch 方式（Edge/Safari CSP 環境用）
  function _directGasCallFetch(action, params, successFn, failFn) {
    var url = _directShellUrl + '?action=' + encodeURIComponent(action);
    if (params) Object.keys(params).forEach(function(k) {
      url += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k] !== undefined ? params[k] : '');
    });
    fetch(url, { redirect: 'follow' })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (successFn) successFn(data);
      })
      .catch(function(e) {
        console.error('[directGasCall fetch error] ' + action, e);
        if (failFn) failFn(e);
      });
  }

  // 啟動頁面後初始化登入
  window.addEventListener('load', initGoogleSignIn);
  
  function startGoogleSignIn() {
    // ── WebView 檢查：提示用外部瀏覽器開啟 ──
    if (isWebView()) {
      var btn = document.getElementById('googleSignInBtn');
      btn.innerHTML =
        '<div style="background:#FFF3E0;border:1px solid #FFB74D;border-radius:var(--radius-md);padding:16px;text-align:center;">'
        + '<div style="font-size:24px;margin-bottom:8px;">🌐</div>'
        + '<div style="font-weight:bold;color:#DC2626;margin-bottom:8px;">請用外部瀏覽器開啟</div>'
        + '<div style="font-size:13px;color:var(--text2);margin-bottom:12px;">LINE / Facebook 內建瀏覽器不支援 Google 登入</div>'
        + '<div style="font-size:13px;color:var(--text1);background:#fff;border-radius:8px;padding:10px;word-break:break-all;">'
        + window.location.href
        + '</div>'
        + '<div style="font-size:12px;color:var(--text3);margin-top:8px;">複製網址後用 Safari 或 Chrome 開啟</div>'
        + '</div>';
      return;
    }

    // ── 正常瀏覽器：使用 GSI One Tap ──
    if (typeof google === 'undefined' || !google.accounts) {
      setTimeout(startGoogleSignIn, 500); return;
    }
    google.accounts.id.initialize({
      client_id:   GOOGLE_CLIENT_ID,
      callback:    handleGoogleSignIn,
      auto_select: true
    });
    google.accounts.id.renderButton(
      document.getElementById('googleSignInBtn'),
      { theme: 'outline', size: 'large', text: 'signin_with', locale: 'zh-TW', width: 300 }
    );
    google.accounts.id.prompt();
  }

  // ── OAuth2 Redirect 殘留處理（清除舊的 hash）──
  function checkOAuthCallback() {
    var hash = window.location.hash;
    if (hash && hash.indexOf('access_token') !== -1) {
      history.replaceState(null, '', window.location.pathname);
    }
    return false; // 已停用 OAuth redirect，永遠回傳 false
  }

    function handleGoogleSignIn(response) {
    try {
      var payload = JSON.parse(atob(response.credential.split('.')[1]));
      _userEmail = payload.email || '';
    } catch(e) { console.error('JWT parse error', e); return; }
    if (!_userEmail) { document.getElementById('authStatus').textContent = '無法取得帳號，請重試'; return; }

    document.getElementById('authStatus').textContent = '⏳ 驗證中... ' + _userEmail;

    gasCall('getSystemConfig', {}, function(cfg) {
      if (cfg && cfg.error === 'unauthorized') {
        document.getElementById('authStatus').textContent = '⛔ 帳號未授權：' + _userEmail + '\n請聯繫管理員申請授權';
        _userEmail = '';
        return;
      }
      // 授權通過 → 儲存快取（12小時免登入）
      saveLoginCache(_userEmail);
      hideAuthOverlay();
      if (cfg && cfg['顧問姓名']) window.ADVISOR_NAME = cfg['顧問姓名'];
      if (cfg && cfg['顧問LINE'])  window.ADVISOR_LINE = cfg['顧問LINE'];
      if (cfg && cfg['顧問電話'])  ADVISOR_PHONE = cfg['顧問電話'];
      initSystem();
    }, function() {
      document.getElementById('authStatus').textContent = '⚠️ 連線失敗，請重新整理頁面';
    });
  }

  // 啟動頁面後初始化登入
  window.addEventListener('load', initGoogleSignIn);

  // ── 系統初始化（授權通過後才執行）──
  function initSystem() {
    switchTab('insurance');  // ★ v6.2：預設展開產險Tab
    setTimeout(initTrackDates, 100);
    setTimeout(loadTodayBirthdays, 500); // 載入今日生日橫幅
    // 載入到期提醒
    gasCall('getExpiringLists', {}, function(result) {
      var hint = document.getElementById('expiryLoadingHint');
      if (hint) hint.style.display = 'none';
      var hasUrgent  = result && result.urgent  && result.urgent.length  > 0;
      var hasWarning = result && result.warning && result.warning.length > 0;
      if (!hasUrgent && !hasWarning) {
        document.getElementById('expiryAlertArea').innerHTML =
          '<div style="background:#E8F5E9;border:1px solid #A5D6A7;border-radius:8px;padding:10px 14px;margin-bottom:8px;font-size:13px;color:#2E7D32;">✅ 目前無即將到期保單</div>';
        return;
      }
      if (hasUrgent)  renderExpiryAlert(result.urgent);
      if (hasWarning) renderEarlyWarning(result.warning);
    }, function() {
      var hint = document.getElementById('expiryLoadingHint');
      if (hint) { hint.style.color='#E65100'; hint.innerHTML='⚠️ 到期提醒載入失敗，請重新整理頁面。'; }
    });
  }

  window.currentPolicyData  = null;  // 跨模組共用
  window.currentTravelData  = null;  // 跨模組共用
  window.ADVISOR_NAME       = 'Pei-lin';  // 跨模組共用
  window.ADVISOR_LINE       = '';  // 跨模組共用
  var ADVISOR_PHONE      = '';
  window.currentTab         = 'insurance';  // 跨模組共用

// ══════════════════════════════════════════════════════
// ★ gasCall／directGasCall 被其他全部 9 個模組呼叫，是最關鍵的橋接
// ══════════════════════════════════════════════════════
window.gasCall       = gasCall;
window.directGasCall = directGasCall;
