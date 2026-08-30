======================================================
補丁：auth.js 加上「舊網址查不到，自動改查新網址」的過渡期容錯
======================================================
等 10 位同事全部確認轉移完成後，這個補丁要整個拿掉，直接把
GAS_API_URL / SHORT_CODE_LOOKUP_URL 兩個值改成新網址、
刪掉 _NEW 那兩個常數跟所有 retry 邏輯，恢復成單一網址的乾淨版本。


────────────────────────────────────────
改動1：第 20 行後面，新增一個新網址常數
────────────────────────────────────────
原本：
  var GAS_API_URL = 'https://script.google.com/macros/s/AKfycbzWMcDK9reNaiuyYYh568eFRNgMFVsMCRUWxOCy_7-w1sOgU-J_A61k3of8Cve7-_gf/exec';

改成（多加一行）：
  var GAS_API_URL = 'https://script.google.com/macros/s/AKfycbzWMcDK9reNaiuyYYh568eFRNgMFVsMCRUWxOCy_7-w1sOgU-J_A61k3of8Cve7-_gf/exec';
  // ★ 搬遷過渡期用：新帳號(nbs.ai.service)底下的部署網址，等全部人轉移完成後這個補丁會拿掉
  var GAS_API_URL_NEW = 'https://script.google.com/macros/s/AKfycbxXcsgvOdFJmtqHC0lbLlpD8cBzOVW9o-UeDsUFJWOxi90KtmQFKhcX064HAoBrZsd5/exec';


────────────────────────────────────────
改動2：第 29 行後面，同樣新增一個新網址常數
────────────────────────────────────────
原本：
  var SHORT_CODE_LOOKUP_URL = 'https://script.google.com/macros/s/AKfycbzWMcDK9reNaiuyYYh568eFRNgMFVsMCRUWxOCy_7-w1sOgU-J_A61k3of8Cve7-_gf/exec'; // ★正式 LIBCODE_URL_

改成（多加一行）：
  var SHORT_CODE_LOOKUP_URL = 'https://script.google.com/macros/s/AKfycbzWMcDK9reNaiuyYYh568eFRNgMFVsMCRUWxOCy_7-w1sOgU-J_A61k3of8Cve7-_gf/exec'; // ★正式 LIBCODE_URL_
  // ★ 搬遷過渡期用：新帳號(nbs.ai.service)底下的部署網址，等全部人轉移完成後這個補丁會拿掉
  var SHORT_CODE_LOOKUP_URL_NEW = 'https://script.google.com/macros/s/AKfycbxXcsgvOdFJmtqHC0lbLlpD8cBzOVW9o-UeDsUFJWOxi90KtmQFKhcX064HAoBrZsd5/exec';


────────────────────────────────────────
改動3：整段取代第 40-79 行的 gasCall 函式
────────────────────────────────────────
原本（第 40-79 行）：
------------------------------------------------------
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
------------------------------------------------------

改成：
------------------------------------------------------
  // JSONP 呼叫 GAS API（帶 email 做授權）
  // ★ 搬遷過渡期：多加一個 _isRetry 參數，舊網址說 unauthorized 時，自動改試新網址一次再判定
  function gasCall(action, params, successFn, failFn, timeout, _isRetry) {
    var cbName = '_gasCb_' + (++_gasCallSeq);
    var timer = null;
    var done  = false;
    var apiUrl = _isRetry ? GAS_API_URL_NEW : GAS_API_URL;
    window[cbName] = function(data) {
      if (done) return; done = true;
      clearTimeout(timer);
      var el = document.getElementById(cbName); if (el) el.parentNode.removeChild(el);
      delete window[cbName];
      // 授權失敗 → 搬遷過渡期：還沒試過新網址的話，自動改試新網址一次
      if (data && data.error === 'unauthorized') {
        if (!_isRetry) {
          gasCall(action, params, successFn, failFn, timeout, true);
          return;
        }
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
    var url = apiUrl + '?action=' + encodeURIComponent(action) + '&callback=' + cbName + '&email=' + encodeURIComponent(_userEmail);
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
------------------------------------------------------


────────────────────────────────────────
改動4：第 130-150 行，短碼查詢那段加上 fallback
────────────────────────────────────────
原本（第 130-150 行）：
------------------------------------------------------
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
------------------------------------------------------

改成：
------------------------------------------------------
    var shortCode = urlParams.get('u');
    if (shortCode && !tokenUrl) {
      _lookupShortCode(SHORT_CODE_LOOKUP_URL, shortCode, function(data) {
        window._directShellUrl = data.shellUrl;
        var overlay = document.getElementById('authOverlay');
        if (overlay) { overlay.style.display = 'none'; overlay.classList.add('hiding'); }
        _userEmail = 'direct_token_user';
        initDirectSystem();
      }, function() {
        // ★ 搬遷過渡期：舊網址查不到，自動改查新網址
        _lookupShortCode(SHORT_CODE_LOOKUP_URL_NEW, shortCode, function(data) {
          window._directShellUrl = data.shellUrl;
          var overlay = document.getElementById('authOverlay');
          if (overlay) { overlay.style.display = 'none'; overlay.classList.add('hiding'); }
          _userEmail = 'direct_token_user';
          initDirectSystem();
        }, function() {
          console.error('短碼查無對應帳號（新舊網址皆查無），改用一般登入流程');
          startGoogleSignIn();
        });
      });
      return; // 已改用非同步流程處理，等待查詢結果回來
    }
------------------------------------------------------


────────────────────────────────────────
改動5：新增一個小工具函式（放在 initGoogleSignIn 函式外面，例如緊接在它後面即可）
────────────────────────────────────────
  // ★ 搬遷過渡期用：向指定網址查短碼，成功/失敗分別呼叫對應的 callback
  function _lookupShortCode(baseUrl, code, onSuccess, onFail) {
    fetch(baseUrl + '?action=getShell&code=' + encodeURIComponent(code))
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data && data.success && data.shellUrl) onSuccess(data);
        else onFail();
      })
      .catch(function() { onFail(); });
  }


======================================================
測試方式
======================================================
1. 存檔 push 上 GitHub 後，等 Vercel 自動部署完成
2. 用還沒轉移的舊同事帳號登入一次，確認完全正常（走的是舊網址，第一次就成功，不會觸發 retry）
3. 用 nbs.ai.service@gmail.com 那個秒開面板網址再測一次，這次應該會自動 fallback 到新網址成功

======================================================
全部人都轉移完成後，怎麼收尾
======================================================
1. GAS_API_URL 直接改成新網址的值，刪掉 GAS_API_URL_NEW 這一行
2. SHORT_CODE_LOOKUP_URL 直接改成新網址的值，刪掉 SHORT_CODE_LOOKUP_URL_NEW 這一行
3. gasCall 函式裡 var apiUrl = _isRetry ? GAS_API_URL_NEW : GAS_API_URL; 這行，改回 var apiUrl = GAS_API_URL;
   並把 unauthorized 判斷裡 if (!_isRetry) { ... } 那段retry邏輯拿掉，恢復成最原本的樣子
4. 短碼查詢那段的 fallback 呼叫也可以拿掉，直接用 _lookupShortCode(SHORT_CODE_LOOKUP_URL, ...) 單一呼叫即可
