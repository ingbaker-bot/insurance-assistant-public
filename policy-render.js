// ══════════════════════════════════════════════════════
// policy-render.js — 保單卡片渲染、稱呼管理、到期預警（ES Module）
// 原本位於 index.html 第 1255–1876 行，拆分示範
// 這是被最多模組共用的「渲染工具層」，依賴（來自尚未拆分的 auth 區塊）：
//   gasCall, directGasCall, _directShellUrl, ADVISOR_NAME, showBdToast, shareViaLine
// ══════════════════════════════════════════════════════

  // ── 旅平卡日期顯示格式化 ──
  // Apps Script 會把 Sheets 日期欄位自動轉成 Date 物件傳給前端
  // 這個函式統一把各種輸入轉成 yyyy/MM/dd 或 yy/MM/dd（民國年）
  function fmtDate(val) {
    if (!val || val === '') return '—';
    var s = String(val).trim();
    // 已是乾淨格式：2011/09/01 或 57/03/12
    if (/^\d{2,4}\/\d{2}\/\d{2}$/.test(s)) return s;
    // 含時區字串（GMT / 台北標準時間）→ 解析後取日期部分
    if (s.indexOf('GMT') !== -1 || s.indexOf(':') !== -1) {
      try {
        var d = new Date(s);
        if (!isNaN(d.getTime())) {
          // 用 UTC+8 取日期，避免時區偏移
          var utc8 = new Date(d.getTime() + 8 * 60 * 60 * 1000);
          var y  = utc8.getUTCFullYear();
          var mo = ('0' + (utc8.getUTCMonth() + 1)).slice(-2);
          var dy = ('0' + utc8.getUTCDate()).slice(-2);
          return y + '/' + mo + '/' + dy;
        }
      } catch(e) {}
    }
    return s;
  }

  // ── 頁面載入時讀取系統設定 ──
  // getSystemConfig 已在 handleGoogleSignIn 中呼叫

  // ══════════════════════════════════════════════
  // ★ 近期到期提醒（5天內）& 提前預警（45~51天）
  // ══════════════════════════════════════════════
  var expiringListCache    = [];
  var earlyWarningCache    = [];

  // getExpiringLists 已在 initSystem 中呼叫

  function renderExpiryAlert(list) {
    var area = document.getElementById('expiryAlertArea');
    if (!list || list.length === 0) { return; }

    expiringListCache = list;

    // 只計算「待處理」的數量（未聯繫），「已聯繫」另外標記
    var pendingCount = list.filter(function(i) { return !i.renewStatus; }).length;
    var contactedCount = list.filter(function(i) { return i.renewStatus === '已聯繫'; }).length;

    var badgeText = pendingCount > 0
      ? pendingCount + ' 張待處理'
      : contactedCount + ' 張等待回覆';

    var html =
      '<div class="expiry-alert-bar">' +
        '<div class="expiry-alert-header" onclick="toggleExpiryAlert()">' +
          '<span class="expiry-alert-title">⏰ 5 天內即將到期</span>' +
          '<span style="display:flex;align-items:center;gap:8px;">' +
            '<span class="expiry-alert-badge">' + list.length + ' 張</span>' +
            '<span style="font-size:12px;color:var(--text3);">' + badgeText + '　▼</span>' +
          '</span>' +
        '</div>' +
        '<div class="expiry-alert-body" id="expiryAlertBody">' +
          renderExpiryRows(list) +
        '</div>' +
      '</div>';
    area.innerHTML = html;
  }


  // ★ v6.3 統一保單卡片渲染函式
  // source: 'urgent'|'warning'|'track'|'unrenewed'
  function renderPolicyCard(item, source) {
    var pno       = (item.policyNo  || '').replace(/'/g, '');
    var name      = (item.name || item.applicantName || '—');
    var safeName  = name.replace(/'/g, "\'");
    var safeType  = (item.type || '').replace(/'/g, "\'");

    // ── 天數徽章 ──
    var daysLeft  = (item.daysLeft != null) ? item.daysLeft : null;
    var dayText   = daysLeft === 0 ? '今天到期！' : (daysLeft != null ? '剩 ' + daysLeft + ' 天' : '');
    var badgeBg   = daysLeft != null && daysLeft <= 5  ? '#FFEBEE' :
                    daysLeft != null && daysLeft <= 15 ? '#FFF3E0' : '#E8F5E9';
    var badgeClr  = daysLeft != null && daysLeft <= 5  ? '#C62828' :
                    daysLeft != null && daysLeft <= 15 ? '#E65100' : '#2E7D32';

    // ── 續保狀態徽章 ──
    var rs = _renewStatusStyle(item.renewStatus);

    // ── 被保人資訊 ──
    var infoHtml = '';
    if (item.maskedId && item.maskedId !== '無')
      infoHtml += '<div class="policy-card-info-item">🪪 ' + item.maskedId + '</div>';
    if (item.birthday && item.birthday !== '無')
      infoHtml += '<div class="policy-card-info-item">🎂 ' + item.birthday + '</div>';
    if (item.insuredPhone && item.insuredPhone !== '無')
      infoHtml += '<div class="policy-card-info-item">📱 ' + item.insuredPhone + '</div>';
    if (item.applicantName && item.applicantName !== '無' && item.applicantName !== name)
      infoHtml += '<div class="policy-card-info-item">👤 要保人：' + item.applicantName + '</div>';
    if (item.applicantId && item.applicantId !== '無')
      infoHtml += '<div class="policy-card-info-item">🪪 ' + item.applicantId + '</div>';
    if (item.applicantPhone && item.applicantPhone !== '無')
      infoHtml += '<div class="policy-card-info-item">📞 ' + item.applicantPhone + '</div>';

    // ── 傳提醒函式（依來源區分）──
    var encodedItem = encodeURIComponent(JSON.stringify({
      name: item.name, type: item.type, policyNo: pno,
      effectiveDate: item.effectiveDate || '', expiry: item.expiry,
      plateNo: item.plateNo, premium: item.premium || '',
      maskedId: item.maskedId || '', daysLeft: daysLeft
    }));
    var shareFn = (source === 'urgent')  ? "expiryQuickShare('" + encodedItem + "','" + pno + "')" :
                  (source === 'warning') ? "earlyWarnShare('"   + encodedItem + "','" + pno + "')" :
                                           "quickShareFromTrack('" + safeName + "','" + safeType + "','" + pno + "','" + item.expiry + "')";

    var statusPanelId  = 'status-panel-' + pno;
    var detailPanelId  = 'detail-panel-' + pno;
    // 把 item 序列化為 data attribute，供展開時渲染（不需再呼叫 API）
    var safeItem = encodeURIComponent(JSON.stringify({
      maskedId:      item.maskedId      || '',
      birthday:      item.birthday      || '',
      insuredPhone:  item.insuredPhone  || '',
      plateNo:       item.plateNo       || '',
      expiry:        item.expiry        || '',
      applicantName: item.applicantName || '',
      applicantId:   item.applicantId   || '',
      applicantPhone:item.applicantPhone|| '',
      address:       item.address       || ''
    }));

    var html =
      '<div class="policy-card" id="pcard-' + pno + '" data-item="' + safeItem + '">' +

        // 頂部：姓名 + 代號 + 天數 + 狀態徽章
        '<div class="policy-card-top">' +
          '<div class="policy-card-name">' + name +
            (item.agentCode && item.agentCode !== '無'
              ? ' <span style="color:#FF9800;font-size:12px;">[' + item.agentCode + ']</span>' : '') +
          '</div>' +
          '<div style="display:flex;gap:5px;align-items:center;flex-wrap:wrap;justify-content:flex-end;">' +
            (dayText ? '<span class="policy-card-badge" style="background:' + badgeBg + ';color:' + badgeClr + ';">' + dayText + '</span>' : '') +
            '<span class="policy-card-badge" id="rs-badge-' + pno + '" style="background:' + rs.bg + ';color:' + rs.clr + ';border:1px solid ' + rs.clr + ';">' + rs.icon + ' ' + rs.label + '</span>' +
          '</div>' +
        '</div>' +

        // 險種 + 車牌 + 到期日
        '<div class="policy-card-type">' +
          '<span>📋 ' + item.type + '</span>' +
          (item.plateNo && item.plateNo !== '無' ? '<span>🚗 ' + item.plateNo + '</span>' : '') +
          '<span style="color:#d32f2f;font-weight:bold;">到期：' + item.expiry + '</span>' +
          (String(item.renewStatus||'').startsWith('他家')
            ? '<span style="background:#FFF3E0;color:#DC2626;font-size:11px;font-weight:bold;padding:1px 7px;border-radius:8px;">🎯 爭取轉單</span>' : '') +
        '</div>' +

        // 被保人/要保人資訊
        (infoHtml ? '<div class="policy-card-info">' + infoHtml + '</div>' : '') +

        // ── 第一層按鈕：保單內容 / 提醒 / 更新狀態 ──
        '<div class="policy-card-btn-row1">' +
          '<button class="policy-card-btn" style="background:#00A3C4;color:white;"' +
            ' onclick="togglePolicyDetail(\'' + pno + '\')">📋 保單內容</button>' +
          '<button class="policy-card-btn" style="background:#00B900;color:white;"' +
            ' onclick="' + shareFn + '">💬 提醒</button>' +
          '<button class="policy-card-btn" style="background:#6A1B9A;color:white;"' +
            ' onclick="toggleStatusPanel(\'' + statusPanelId + '\')">✏️ 更新狀態</button>' +
        '</div>' +

        // ── 詳情展開區（點「保單內容」展開，資料來自 data-item）──
        '<div class="policy-card-detail-panel" id="' + detailPanelId + '">' +
          '<div class="policy-card-detail-inner" id="detail-inner-' + pno + '">' +
            '（載入中）' +
          '</div>' +
        '</div>' +

        // ── 第二層：狀態按鈕（點「更新狀態」展開）──
        '<div class="policy-card-status-panel" id="' + statusPanelId + '">' +
          '<div class="policy-card-status-hint">選擇後自動儲存並收合</div>' +
          '<div class="policy-card-status-row">' +
            '<button class="policy-card-status-btn" style="background:#E3F2FD;color:#1565C0;"' +
              ' onclick="pcardSetStatus(\'' + pno + '\',\'已聯繫\',\'' + source + '\')">📞 已聯繫</button>' +
            '<button class="policy-card-status-btn" style="background:#E8F5E9;color:#2E7D32;"' +
              ' onclick="pcardSetStatus(\'' + pno + '\',\'已續保\',\'' + source + '\')">✅ 已續保</button>' +
            '<button class="policy-card-status-btn" style="background:#FAFAFA;color:var(--text2);border:1px solid #DDD;"' +
              ' onclick="pcardSetStatus(\'' + pno + '\',\'不續保\',\'' + source + '\')">✗ 不續保</button>' +
            '<button class="policy-card-status-btn" style="background:#E8F5E9;color:#1B5E20;"' +
              ' onclick="pcardSetStatus(\'' + pno + '\',\'已過戶\',\'' + source + '\')">🔄 已過戶</button>' +
            '<button class="policy-card-status-btn" style="background:#EFEBE9;color:#4E342E;"' +
              ' onclick="pcardSetStatus(\'' + pno + '\',\'已報廢\',\'' + source + '\')">🗑️ 已報廢</button>' +
          '</div>' +
        '</div>' +

      '</div>';
    return html;
  }

  // 展開/收合保單詳情區（原地展開，不呼叫 API）
  function togglePolicyDetail(pno) {
    var panel  = document.getElementById('detail-panel-' + pno);
    var btn    = document.getElementById('detail-btn-' + pno);
    var card   = document.getElementById('pcard-' + pno);
    if (!panel) return;

    var isOpen = panel.classList.contains('open');
    if (isOpen) {
      panel.classList.remove('open');
      if (btn) btn.textContent = '📋 保單內容';
      return;
    }

    // 第一次展開：從 data-item 取資料渲染
    var inner = document.getElementById('detail-inner-' + pno);
    if (inner && card) {
      try {
        var d = JSON.parse(decodeURIComponent(card.getAttribute('data-item') || '{}'));
        var html =
          '<div class="policy-card-detail-grid">' +
            '<div>' +
              '<div class="policy-card-detail-col-title">👤 被保人</div>' +
              (d.maskedId     ? '<div class="policy-card-detail-row">🆔 ' + d.maskedId     + '</div>' : '') +
              (d.birthday     ? '<div class="policy-card-detail-row">🎂 ' + d.birthday     + '</div>' : '') +
              (d.insuredPhone ? '<div class="policy-card-detail-row">📱 ' + d.insuredPhone + '</div>' : '') +
              (d.plateNo && d.plateNo !== '無' ? '<div class="policy-card-detail-row">🚗 ' + d.plateNo + '</div>' : '') +
              (d.expiry       ? '<div class="policy-card-detail-row">📅 ' + d.expiry       + '</div>' : '') +
            '</div>' +
            '<div>' +
              '<div class="policy-card-detail-col-title">📞 要保人</div>' +
              (d.applicantName  ? '<div class="policy-card-detail-row">' + d.applicantName  + '</div>' : '') +
              (d.applicantId && d.applicantId !== '無' ? '<div class="policy-card-detail-row">🪪 ' + d.applicantId + '</div>' : '') +
              (d.applicantPhone ? '<div class="policy-card-detail-row">' + d.applicantPhone + '</div>' : '') +
              (d.address && d.address !== '無' ? '<div class="policy-card-detail-row">🏠 ' + d.address + '</div>' : '') +
            '</div>' +
          '</div>' +
          // ★ 保單明細按鈕（進入 Modal 詳情）
          '<div style="margin-top:10px;padding-top:8px;border-top:1px dashed #E0E0E0;">' +
            '<button onclick="openDetailFromExpiry(\'' + pno + '\')" ' +
              'style="width:100%;padding:10px;background:#F5F5F5;color:var(--text1);border:1px solid #DDD;' +
                     'border-radius:8px;font-size:13px;font-weight:bold;cursor:pointer;">' +
              '🔍 查看保單明細（附加險項目）' +
            '</button>' +
          '</div>';
        inner.innerHTML = html;
      } catch(e) { inner.innerHTML = '<div style="color:var(--text3);font-size:12px;">資料讀取失敗</div>'; }
    }

    panel.classList.add('open');
    if (btn) btn.textContent = '📋 保單內容 ▲';
    // 關閉狀態面板（避免同時展開）
    var sp = document.getElementById('status-panel-' + pno);
    if (sp) sp.classList.remove('open');
  }

  // 展開/收合第二層狀態面板
  function toggleStatusPanel(panelId) {
    var p = document.getElementById(panelId);
    if (p) p.classList.toggle('open');
    // 關閉詳情面板（避免同時展開）
    var pno = panelId.replace('status-panel-', '');
    var dp = document.getElementById('detail-panel-' + pno);
    if (dp) {
      dp.classList.remove('open');
      var btn = document.getElementById('detail-btn-' + pno);
      if (btn) btn.textContent = '📋 保單內容';
    }
  }

  // 統一狀態設定（轉接到各 source 的原有函式）
  function pcardSetStatus(pno, status, source) {
    // 先更新 UI（即時反饋）
    var rs = _renewStatusStyle(status);
    var badge = document.getElementById('rs-badge-' + pno);
    if (badge) {
      badge.textContent       = rs.icon + ' ' + rs.label;
      badge.style.background  = rs.bg;
      badge.style.color       = rs.clr;
      badge.style.borderColor = rs.clr;
    }
    // 已續保/不續保/已過戶/已報廢 → 淡化卡片
    if (['已續保','不續保','已過戶','已報廢'].includes(status)) {
      var card = document.getElementById('pcard-' + pno);
      if (card) card.style.opacity = '0.4';
    }
    // 收合第二層面板
    var p = document.getElementById('status-panel-' + pno);
    if (p) p.classList.remove('open');

    // 呼叫對應的後端寫入函式
    if (source === 'urgent')       setRenewalStatus(pno, status);
    else if (source === 'warning') setEarlyWarningStatus(pno, status);
    else                           setTrackStatus(pno, status);
  }

  // setTrackStatus：自訂區間 & 近30天未續保用
  function setTrackStatus(pno, status) {
    var onOk  = function(r){ showBdToast(r && r.success ? '✓ 已更新為「' + status + '」' : '⚠️ 更新失敗'); };
    var onErr = function(){ showBdToast('⚠️ 網路錯誤，請重試'); };
    if (_directShellUrl) {
      directGasCall('updateRenewalStatus', { policyNo: pno, status: status }, onOk, onErr);
    } else {
      gasCall('updateRenewalStatus', { policyNo: pno, status: status }, onOk, onErr);
    }
  }

  function renderExpiryRows(list) {
    // ★ v6.1 改用統一保單卡片格式
    var html = '';
    list.forEach(function(item) { html += renderPolicyCard(item, 'urgent'); });
    return html;
  }

  function openDetailFromExpiry(policyNo) {
    document.getElementById('loading').style.display = 'block';
    
    // 【雙軌優化】到期提醒的明細查看同樣加入雙軌路由
    if (_directShellUrl) {
      directGasCall('getPolicyDetails', { no: policyNo }, renderModal, function() {
        document.getElementById('loading').style.display = 'none';
        alert('讀取保單詳情失敗，請稍後再試。');
      });
    } else {
      gasCall('getPolicyDetails', { no: policyNo }, renderModal, function() {
        document.getElementById('loading').style.display = 'none';
        alert('讀取保單詳情失敗，請稍後再試。');
      });
    }
  }

  function toggleExpiryAlert() {
    var body = document.getElementById('expiryAlertBody');
    if (body) body.classList.toggle('open');
  }

  // ══════════════════════════════════════════════
  // ★ 稱呼管理
  // ══════════════════════════════════════════════
  var _nicknameCallback = null; // 稱呼確認後要執行的函式

  /**
   * 組訊息前先查詢稱呼
   * insuredId: 被保人身分證號
   * name: 被保人姓名（備用）
   * callback(salutation): 稱呼確定後的回呼，salutation 就是「建明哥」或「李建明」
   */
  function withNickname(insuredId, name, callback) {
    document.getElementById('loading').style.display = 'block';
    gasCall('getCustomerNickname', { id: insuredId }, function(result) {
        document.getElementById('loading').style.display = 'none';
        if (result && result.nickname) {
          callback(result.nickname);
        } else {
          document.getElementById('nicknameTitleText').textContent = '請輸入 ' + name + ' 的稱呼';
          document.getElementById('nicknameInput').value = '';
          document.getElementById('nicknameOverlay').classList.add('show');
          _nicknameCallback = function(salutation) {
            if (salutation && salutation !== name) {
              gasCall('saveCustomerNickname', { id: insuredId, nick: salutation }, null, null);
            }
            callback(salutation);
          };
          setTimeout(function() { document.getElementById('nicknameInput').focus(); }, 100);
        }
      }, function() { document.getElementById('loading').style.display = 'none'; callback(name); });
  }

  function nicknameConfirm() {
    var val = document.getElementById('nicknameInput').value.trim();
    document.getElementById('nicknameOverlay').classList.remove('show');
    if (_nicknameCallback) {
      var targetName = document.getElementById('nicknameTitleText').textContent.replace('請輸入 ', '').replace(' 的稱呼', '');
      var salutation = val || targetName;
      
      // 異步儲存新稱呼到 Sheets 中，但「不等待它儲存完」，立刻放行去發送訊息，搶抓剪貼簿黃金時間！
      if (val && val !== targetName && _directShellUrl) {
        var urlParams = new URLSearchParams(window.location.search);
        var insuredId = _nicknameInsuredId || ''; // 確保有記錄身分證號
        directGasCall('saveCustomerNickname', { id: insuredId, nick: salutation }, null);
      } else if (val && val !== targetName) {
        var insuredId = _nicknameInsuredId || '';
        gasCall('saveCustomerNickname', { id: insuredId, nick: salutation }, null, null);
      }
      
      _nicknameCallback(salutation);
      _nicknameCallback = null;
    }
  }

  function nicknameSkip() {
    document.getElementById('nicknameOverlay').classList.remove('show');
    if (_nicknameCallback) {
      var name = document.getElementById('nicknameTitleText').textContent.replace('請輸入 ', '').replace(' 的稱呼', '');
      _nicknameCallback(name);
      _nicknameCallback = null;
    }
  }

  // Enter 鍵也能確認
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && document.getElementById('nicknameOverlay').classList.contains('show')) {
      nicknameConfirm();
    }
  });

  function expiryQuickShare(encodedItem, policyNo) {
    var item = JSON.parse(decodeURIComponent(encodedItem));
    // 先標記已聯繫
    if (_directShellUrl) {
    directGasCall('updateRenewalStatus', { policyNo: policyNo, status: '已聯繫' }, null);
  } else {
    gasCall('updateRenewalStatus', { policyNo: policyNo, status: '已聯繫' }, null, null);
  }
  updateExpiryRowStatus(policyNo, '已聯繫');

    // 查詢稱呼後組訊息
    withNickname(item.maskedId || '', item.name, function(salutation) {
      gasCall('getPolicyDetails', { no: policyNo }, function(data) {
          var msg = buildPolicyMsg(salutation, item.type, item.plateNo,
            item.effectiveDate, item.expiry, item.premium,
            data ? data.details : []);
          shareViaLine(msg);
        });
    });
  }

  // 5天內到期提醒的按鈕控制
  function setRenewalStatus(policyNo, status) {
    var onSuccess = function(result) {
      if (result && result.success) {
        if (status === '已續保' || status === '不續保' || status === '已過戶' || status === '已報廢') {
          removeExpiryRow(policyNo);
        } else {
          updateExpiryRowStatus(policyNo, status);
        }
      }
    };

    // 【雙軌優化】直連模式直接寫入地方試算表 Z 欄
    if (_directShellUrl) {
      directGasCall('updateRenewalStatus', { policyNo: policyNo, status: status }, onSuccess);
    } else {
      gasCall('updateRenewalStatus', { policyNo: policyNo, status: status }, onSuccess);
    }
  }

  function updateExpiryRowStatus(policyNo, status) {
    // 重新渲染單筆（更新快取後重繪）
    expiringListCache.forEach(function(item) {
      if (item.policyNo === policyNo) item.renewStatus = status;
    });
    var body = document.getElementById('expiryAlertBody');
    if (body) body.innerHTML = renderExpiryRows(expiringListCache);
  }

  function removeExpiryRow(policyNo) {
    expiringListCache = expiringListCache.filter(function(i) { return i.policyNo !== policyNo; });
    if (expiringListCache.length === 0) {
      document.getElementById('expiryAlertArea').innerHTML = '';
    } else {
      renderExpiryAlert(expiringListCache);
      var body = document.getElementById('expiryAlertBody');
      if (body) body.classList.add('open');
    }
  }

  // ══════════════════════════════════════════════
  // ★ 45～51 天提前預警
  // ══════════════════════════════════════════════
  function renderEarlyWarning(list) {
    var area = document.getElementById('earlyWarningArea');
    if (!list || list.length === 0) { area.innerHTML = ''; return; }
    earlyWarningCache = list;

    var html =
      '<div class="expiry-alert-bar" style="border-color:#C8E6C9;">' +
        '<div class="expiry-alert-header" style="background:#F1F8E9;" onclick="toggleEarlyWarning()">' +
          '<span class="expiry-alert-title" style="color:#388E3C;">📅 45～51 天即將到期</span>' +
          '<span style="display:flex;align-items:center;gap:8px;">' +
            '<span class="expiry-alert-badge" style="background:#388E3C;">' + list.length + ' 張</span>' +
            '<span style="font-size:12px;color:var(--text3);">提前預警　▼</span>' +
          '</span>' +
        '</div>' +
        '<div class="expiry-alert-body" id="earlyWarningBody">' +
          renderEarlyWarningRows(list) +
        '</div>' +
      '</div>';
    area.innerHTML = html;
  }

  function renderEarlyWarningRows(list) {
    // ★ v6.1 改用統一保單卡片格式
    var html = '';
    list.forEach(function(item) { html += renderPolicyCard(item, 'warning'); });
    return html;
  }

  function toggleEarlyWarning() {
    var body = document.getElementById('earlyWarningBody');
    if (body) body.classList.toggle('open');
  }

  function earlyWarnShare(encodedItem, policyNo) {
    var item = JSON.parse(decodeURIComponent(encodedItem));
    
    // 背景同步標記 Z 欄為「已聯繫」
    if (_directShellUrl) {
      directGasCall('updateRenewalStatus', { policyNo: policyNo, status: '已聯繫' }, null);
    } else {
      gasCall('updateRenewalStatus', { policyNo: policyNo, status: '已聯繫' }, null, null);
    }
    updateEarlyWarningStatus(policyNo, '已聯繫');

    // 記錄目前的身分證號供稱呼表快取使用
    window._nicknameInsuredId = item.maskedId || '';

    withNickname(item.maskedId || '', item.name, function(salutation) {
      // 1. 定義撈取細項明細成功後的回呼邏輯
      var onDetailsLoaded = function(data) {
        document.getElementById('loading').style.display = 'none';
        
        // 智慧型交叉比對：優先採用地方試算表帶回來的最新真實數據，否則才降級用外層卡片的舊資料
        var finalEffective = (data && data.main && data.main.effectiveDate && data.main.effectiveDate !== '無') ? data.main.effectiveDate : item.effectiveDate;
        var finalPremium   = (data && data.main && data.main.premium       && data.main.premium !== '無')       ? data.main.premium       : item.premium;
        var finalExpiry    = (data && data.main && data.main.expiry        && data.main.expiry !== '無')        ? data.main.expiry        : item.expiry;
        
        // 清洗與防護：防範 undefined 或橫線亂跳
        var effStr  = (finalEffective && finalEffective !== 'undefined' && finalEffective !== '—') ? finalEffective : '—';
        var premStr = (finalPremium   && finalPremium   !== 'undefined' && finalPremium   !== '—') ? finalPremium   : '—';
        var expStr  = (finalExpiry    && finalExpiry    !== 'undefined' && finalExpiry    !== '—') ? finalExpiry    : item.expiry;
        
        var msg = "🌟【保單續保提前通知】🌟\n\n";
        msg += salutation + " 您好！\n\n";
        msg += "📋 您的以下保單將於 " + item.daysLeft + " 天後到期，請檢視原保單內容，後續我再傳送今年續保內容：\n";
        msg += "────────────────────\n";
        msg += "📄 險種：" + item.type + "\n";
        if (item.plateNo && item.plateNo !== '無' && item.plateNo !== 'undefined') {
          msg += "🚗 車號：" + item.plateNo + "\n";
        }
        msg += "📅 生效日：" + effStr + "\n";
        msg += "⏰ 到期日：" + expStr + "\n";
        msg += "💰 總保費：NT$ " + premStr + " 元\n";
        
        // 如果後端有抓到保障細項明細，加進話術中
        if (data && data.details && data.details.length > 0) {
          msg += "\n📌 保障明細：\n";
          data.details.forEach(function(d) {
            msg += "  • " + d.name;
            if (d.amount && d.amount !== '無') msg += " 保額 " + d.amount;
            if (d.premium && d.premium !== '無' && d.premium !== '0') msg += " 保費 " + d.premium + " 元";
            msg += "\n";
          });
        }
        msg += "────────────────────\n\n";
        msg += "若有任何問題，請隨時回覆聯繫 " + ADVISOR_NAME + "！🙌";
        if (ADVISOR_LINE) msg += "\n📲 加入 LINE：https://line.me/ti/p/" + ADVISOR_LINE;
        
        shareViaLine(msg); // 執行雙軌發送或複製
      };

      // 2. 定義斷線或降級時的備用邏輯
      var onDetailsFailed = function() {
        document.getElementById('loading').style.display = 'none';
        var effStr  = (item.effectiveDate && item.effectiveDate !== 'undefined' && item.effectiveDate !== '無') ? item.effectiveDate : '—';
        var premStr = (item.premium       && item.premium       !== 'undefined' && item.premium       !== '無') ? item.premium       : '—';
        
        var msg = "🌟【保單續保提前通知】🌟\n\n";
        msg += salutation + " 您好！\n\n";
        msg += "📋 您的以下保單將於 " + item.daysLeft + " 天後到期，請檢視原保單內容，後續我再傳送今年續保內容：\n";
        msg += "────────────────────\n";
        msg += "📄 險種：" + item.type + "\n";
        if (item.plateNo && item.plateNo !== '無' && item.plateNo !== 'undefined') {
          msg += "🚗 車號：" + item.plateNo + "\n";
        }
        msg += "📅 生效日：" + effStr + "\n";
        msg += "⏰ 到期日：" + item.expiry + "\n";
        msg += "💰 總保費：NT$ " + premStr + " 元\n";
        msg += "────────────────────\n\n";
        msg += "若有任何問題，請隨時回覆聯繫 " + ADVISOR_NAME + "！🙌";
        if (ADVISOR_LINE) msg += "\n📲 加入 LINE：https://line.me/ti/p/" + ADVISOR_LINE;
        
        shareViaLine(msg);
      };

      // 3. 雙軌判斷路由執行發送
      if (_directShellUrl) {
        directGasCall('getPolicyDetails', { no: policyNo }, onDetailsLoaded, onDetailsFailed);
      } else {
        gasCall('getPolicyDetails', { no: policyNo }, onDetailsLoaded, onDetailsFailed);
      }
    });
  }

  // 45~51天提前預警的按鈕控制 (已被正確分離出來)
  function setEarlyWarningStatus(policyNo, status) {
    var onSuccess = function(result) {
      if (result && result.success) {
        if (status === '已續保' || status === '不續保' || status === '已過戶' || status === '已報廢') {
          removeEarlyWarningRow(policyNo);
        } else {
          updateEarlyWarningStatus(policyNo, status);
        }
      }
    };

    // 直連模式直接寫入地方試算表 Z 欄
    if (_directShellUrl) {
      directGasCall('updateRenewalStatus', { policyNo: policyNo, status: status }, onSuccess);
    } else {
      gasCall('updateRenewalStatus', { policyNo: policyNo, status: status }, onSuccess);
    }
  }

  function updateEarlyWarningStatus(policyNo, status) {
    earlyWarningCache.forEach(function(item) {
      if (item.policyNo === policyNo) item.renewStatus = status;
    });
    var body = document.getElementById('earlyWarningBody');
    if (body) body.innerHTML = renderEarlyWarningRows(earlyWarningCache);
  }

  function removeEarlyWarningRow(policyNo) {
    earlyWarningCache = earlyWarningCache.filter(function(i) { return i.policyNo !== policyNo; });
    if (earlyWarningCache.length === 0) {
      document.getElementById('earlyWarningArea').innerHTML = '';
    } else {
      renderEarlyWarning(earlyWarningCache);
      var body = document.getElementById('earlyWarningBody');
      if (body) body.classList.add('open');
    }
  }

// ══════════════════════════════════════════════════════
// ★ 把 index.html 內 onclick="..." 會呼叫到的函式，以及被
//   尚未拆分的 auth 區塊、已拆分的 family.js／tabs-search.js／
//   cali-opportunity.js／expiry-fire.js 當作共用工具呼叫的函式，
//   expose 到全域（本模組是被最多其他模組依賴的共用層，務必完整）
// ══════════════════════════════════════════════════════
window.togglePolicyDetail      = togglePolicyDetail;
window.toggleStatusPanel       = toggleStatusPanel;
window.pcardSetStatus          = pcardSetStatus;
window.openDetailFromExpiry    = openDetailFromExpiry;
window.toggleExpiryAlert       = toggleExpiryAlert;
window.nicknameConfirm         = nicknameConfirm;
window.nicknameSkip            = nicknameSkip;
window.toggleEarlyWarning      = toggleEarlyWarning;
window.fmtDate                 = fmtDate;
window.renderExpiryAlert       = renderExpiryAlert;
window.renderPolicyCard        = renderPolicyCard;
window.setTrackStatus          = setTrackStatus;
window.renderEarlyWarning      = renderEarlyWarning;
window.withNickname            = withNickname;
window.removeExpiryRow         = removeExpiryRow;
window.removeEarlyWarningRow   = removeEarlyWarningRow;
window.expiryQuickShare         = expiryQuickShare;
window.earlyWarnShare           = earlyWarnShare;
