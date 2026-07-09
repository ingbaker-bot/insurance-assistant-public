// ══════════════════════════════════════════════════════
// expiry-fire.js — 到期保單追蹤、住宅火險追蹤（ES Module）
// 原本位於 index.html 第 2187–2825 行，拆分示範
// 依賴（來自尚未拆分的其他區塊，皆為全域變數/函式，載入順序已確保先於本模組執行）：
//   gasCall, directGasCall, _directShellUrl, ADVISOR_NAME, ADVISOR_LINE, shareViaLine
//   renderVehicleGapList, _trackStatusStyle（定義於已拆分的 cali-opportunity.js，已由該模組 expose 到全域）
// 本模組的 _renewStatusStyle、initTrackDates、quickShareFromTrack
// 被尚未拆分的 policy-render／auth 區塊直接呼叫，務必 expose 到全域
// ══════════════════════════════════════════════════════

    // ══════════════════════════════════════════════════════
  // ★ 到期保單追蹤功能
  // ══════════════════════════════════════════════════════

  // ★ 到期保單追蹤：展開/收合面板
  function toggleExpiryPanel() {
    var panel = document.getElementById("expiryTrackPanel");
    var btn   = document.getElementById("btnExpiryTrack");
    var isOpen = panel.style.display !== "none";
    panel.style.display = isOpen ? "none" : "block";
    var sub = btn.querySelector("span");
    if (sub) sub.textContent = isOpen ? "點選選擇日期" : "點擊收起";
    // 展開時自動設預設日期（今天起 60 天）
    if (!isOpen) {
      var today   = new Date();
      var start6  = new Date(today); start6.setDate(today.getDate() + 6);
      var endOfM  = new Date(today.getFullYear(), today.getMonth() + 1, 0); // 當月最後一日
      var fmt = function(d){ return d.getFullYear()+"-"+("0"+(d.getMonth()+1)).slice(-2)+"-"+("0"+d.getDate()).slice(-2); };
      var roc = function(d){ return (d.getFullYear()-1911)+"/"+("0"+(d.getMonth()+1)).slice(-2)+"/"+("0"+d.getDate()).slice(-2); };
      var s = document.getElementById("trackStartDate");
      var e = document.getElementById("trackEndDate");
      var st = document.getElementById("trackStartText");
      var et = document.getElementById("trackEndText");
      if (s && !s.value) { s.value = fmt(start6); if(st) st.textContent = roc(start6); }
      if (e && !e.value) { e.value = fmt(endOfM); if(et) et.textContent = roc(endOfM); }
    }
  }

  // 續保狀態樣式
  function _renewStatusStyle(status) {
    if (!status || status === '') return { bg:'#F5F5F5', clr:'#999', icon:'⬜', label:'未標記' };
    if (status === '已續保')          return { bg:'#E8F5E9', clr:'#2E7D32', icon:'✅', label:'已續保' };
    if (status === '不續保')          return { bg:'#FFEBEE', clr:'#C62828', icon:'❌', label:'不續保' };
    if (status === '已聯繫')          return { bg:'#E3F2FD', clr:'#1565C0', icon:'📨', label:'已聯繫' };
    if (status.startsWith('他家'))    return { bg:'#FFF3E0', clr:'#E65100', icon:'🏢', label:'他家承保' };
    return { bg:'#EDE7F6', clr:'#6A1B9A', icon:'📌', label: status };
  }

  // 初始化日期選擇器（預設本月1日到今天+7天）
  // ★ v6.6 自訂日期選擇器
  var _dpTarget = 'start';  // 'start' or 'end'

  function openDatePicker(target) {
    _dpTarget = target;
    var isStart = target === 'start';
    document.getElementById('dpTitle').textContent = isStart ? '選擇開始日期' : '選擇結束日期';

    // ★ 預設日期：開始=今天+6天，結束=當月最後一日
    var cur = document.getElementById(isStart ? 'trackStartDate' : 'trackEndDate').value;
    var d;
    if (cur) {
      d = new Date(cur);
    } else if (isStart) {
      // 開始日期預設：今天 + 6 天
      d = new Date();
      d.setDate(d.getDate() + 6);
    } else {
      // 結束日期預設：當月最後一日
      var now = new Date();
      d = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }
    var roc = d.getFullYear() - 1911;

    // 填充年份（民國100~125年）
    var ySel = document.getElementById('dpYear');
    ySel.innerHTML = '';
    var curYear = new Date().getFullYear() - 1911;
    for (var y = curYear - 5; y <= curYear + 5; y++) {
      var opt = document.createElement('option');
      opt.value = y; opt.textContent = y + ' 年';
      if (y === roc) opt.selected = true;
      ySel.appendChild(opt);
    }

    // 填充月份（1~12）
    var mSel = document.getElementById('dpMonth');
    mSel.innerHTML = '';
    for (var m = 1; m <= 12; m++) {
      var opt = document.createElement('option');
      opt.value = m; opt.textContent = m + ' 月';
      if (m === d.getMonth() + 1) opt.selected = true;
      mSel.appendChild(opt);
    }
    // 移除舊的 listener 避免重複累積
    var newMSel = mSel.cloneNode(true);
    mSel.parentNode.replaceChild(newMSel, mSel);
    document.getElementById('dpMonth').addEventListener('change', function(){ refreshDpDays(); });
    document.getElementById('dpYear').addEventListener('change', function(){ refreshDpDays(); });

    // 填充日
    refreshDpDays(d.getDate());

    // ★ 定位：出現在觸發按鈕正下方
    var triggerEl = document.getElementById(isStart ? 'trackStartDisplay' : 'trackEndDisplay');
    var panel     = document.getElementById('datepickerPanel');
    panel.style.display = 'block';
    document.getElementById('datepickerOverlay').style.display = 'block';

    var rect      = triggerEl.getBoundingClientRect();
    var panelW    = 340;
    var left      = rect.left;
    var top       = rect.bottom + 8;

    // 防止超出右側螢幕
    if (left + panelW > window.innerWidth - 10) {
      left = window.innerWidth - panelW - 10;
    }
    // 防止超出底部螢幕 → 改顯示在按鈕上方
    var panelH = document.getElementById('datepickerInner').offsetHeight || 320;
    if (top + panelH > window.innerHeight - 20) {
      top = rect.top - panelH - 8;
    }
    // 手機（寬度小於 500）→ 置中底部
    if (window.innerWidth < 500) {
      panel.style.left   = '0';
      panel.style.top    = '';
      panel.style.bottom = '0';
      panel.style.width  = '100%';
      document.getElementById('datepickerInner').style.width         = '100%';
      document.getElementById('datepickerInner').style.maxWidth      = '100%';
      document.getElementById('datepickerInner').style.borderRadius  = '18px 18px 0 0';
    } else {
      panel.style.left   = left + 'px';
      panel.style.top    = top  + 'px';
      panel.style.bottom = '';
      panel.style.width  = 'auto';
      document.getElementById('datepickerInner').style.width         = '340px';
      document.getElementById('datepickerInner').style.borderRadius  = '14px';
    }
  }

  function refreshDpDays(preSelectDay) {
    var y    = parseInt(document.getElementById('dpYear').value)  + 1911;
    var m    = parseInt(document.getElementById('dpMonth').value);
    var days = new Date(y, m, 0).getDate();  // 該月天數
    var dSel = document.getElementById('dpDay');
    var prev = preSelectDay || parseInt(dSel.value) || 1;
    dSel.innerHTML = '';
    for (var d = 1; d <= days; d++) {
      var opt = document.createElement('option');
      opt.value = d; opt.textContent = d + ' 日';
      if (d === Math.min(prev, days)) opt.selected = true;
      dSel.appendChild(opt);
    }
  }

  function confirmDatePicker() {
    var y   = parseInt(document.getElementById('dpYear').value)  + 1911;
    var m   = parseInt(document.getElementById('dpMonth').value);
    var d   = parseInt(document.getElementById('dpDay').value);
    var fmt = y + '-' + ('0'+m).slice(-2) + '-' + ('0'+d).slice(-2);
    var roc = (y - 1911) + '/' + ('0'+m).slice(-2) + '/' + ('0'+d).slice(-2);

    if (_dpTarget === 'start') {
      document.getElementById('trackStartDate').value = fmt;
      document.getElementById('trackStartText').textContent = roc;
    } else {
      document.getElementById('trackEndDate').value = fmt;
      document.getElementById('trackEndText').textContent  = roc;
    }
    closeDatePicker();
  }

  function closeDatePicker() {
    document.getElementById('datepickerOverlay').style.display = 'none';
    document.getElementById('datepickerPanel').style.display   = 'none';
  }

  // 快速設定區間（相對今天的天數偏移）
  function setDateRange(startOffset, endOffset) {
    var today = new Date();
    var s = new Date(today); s.setDate(today.getDate() + startOffset);
    var e = new Date(today); e.setDate(today.getDate() + endOffset);
    var fmt = function(d) {
      return d.getFullYear() + '-' + ('0'+(d.getMonth()+1)).slice(-2) + '-' + ('0'+d.getDate()).slice(-2);
    };
    var roc = function(d) {
      return (d.getFullYear()-1911) + '/' + ('0'+(d.getMonth()+1)).slice(-2) + '/' + ('0'+d.getDate()).slice(-2);
    };
    document.getElementById('trackStartDate').value = fmt(s);
    document.getElementById('trackEndDate').value   = fmt(e);
    document.getElementById('trackStartText').textContent = roc(s);
    document.getElementById('trackEndText').textContent   = roc(e);
    closeDatePicker();
  }

  function initTrackDates() {
    var today = new Date();
    var start = new Date(today.getFullYear(), today.getMonth(), 1); // 本月1日
    var end   = new Date(today); end.setDate(end.getDate() + 7);    // 今天+7天

    var fmt = function(d) {
      var m = String(d.getMonth()+1).padStart(2,'0');
      var day = String(d.getDate()).padStart(2,'0');
      return d.getFullYear() + '-' + m + '-' + day;
    };

    var s = document.getElementById('trackStartDate');
    var e = document.getElementById('trackEndDate');
    if (s && !s.value) s.value = fmt(start);
    if (e && !e.value) e.value = fmt(end);
  }

  // 查詢自訂區間到期保單
  function loadExpiryRange() {
    var startEl = document.getElementById('trackStartDate');
    var endEl   = document.getElementById('trackEndDate');
    if (!startEl.value || !endEl.value) { alert('請選擇開始和結束日期'); return; }

    // 轉民國年
    var toRoc = function(isoDate) {
      var p = isoDate.split('-');
      return (parseInt(p[0])-1911) + '/' + p[1] + '/' + p[2];
    };

    var startDate = toRoc(startEl.value);
    var endDate   = toRoc(endEl.value);

    document.getElementById('loading').style.display = 'block';
    document.getElementById('resultsList').innerHTML = '';

    var fn = function(result) {
      renderExpiryTrackList(result, startDate + ' ～ ' + endDate, false);
    };
    var failFn = function() {
      document.getElementById('loading').style.display = 'none';
      document.getElementById('resultsList').innerHTML = '<p style="text-align:center;color:#d32f2f;">讀取失敗，請稍後再試</p>';
    };
    if (_directShellUrl) {
      directGasCall('getExpiringByDateRange', { startDate: startDate, endDate: endDate }, fn, failFn);
    } else {
      gasCall('getExpiringByDateRange', { startDate: startDate, endDate: endDate }, fn, failFn);
    }
  }

  // 近30天未續保名冊
  function loadUnrenewed() {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('resultsList').innerHTML = '';
    var fn = function(result) {
      renderExpiryTrackList(result, '近30天未續保', true);
    };
    var failFn = function() {
      document.getElementById('loading').style.display = 'none';
      document.getElementById('resultsList').innerHTML = '<p style="text-align:center;color:#d32f2f;">讀取失敗，請稍後再試</p>';
    };
    if (_directShellUrl) {
      directGasCall('getUnrenewedLastMonth', {}, fn, failFn);
    } else {
      gasCall('getUnrenewedLastMonth', {}, fn, failFn);
    }
  }

  // 渲染到期追蹤清單
  function renderExpiryTrackList(result, title, isUnrenewed) {
    document.getElementById('loading').style.display = 'none';
    var list = document.getElementById('resultsList');

    if (!result || result.error) {
      list.innerHTML = '<p style="text-align:center;color:#d32f2f;">⚠️ ' + (result ? result.error : '讀取失敗') + '</p>';
      return;
    }
    if (!result.list || result.list.length === 0) {
      list.innerHTML = '<div style="background:#E8F5E9;border-radius:var(--radius-md);padding:16px;text-align:center;color:#2E7D32;font-weight:bold;">🎉 ' +
        (isUnrenewed ? '近30天內到期的保單都已續保，無未追蹤記錄！' : '此區間無到期保單') + '</div>';
      return;
    }

    var titleBg  = isUnrenewed ? '#FFEBEE' : '#EDE7F6';
    var titleClr = isUnrenewed ? '#C62828' : '#6A1B9A';
    var html = '<div style="background:' + titleBg + ';border-radius:var(--radius-md);padding:14px 16px;margin-bottom:16px;">' +
      '<div style="color:' + titleClr + ';font-weight:bold;font-size:15px;">' +
      (isUnrenewed ? '⚠️' : '📅') + ' ' + title + '：共 ' + result.total + ' 張</div>' +
      (isUnrenewed ? '<div style="font-size:12px;color:var(--text3);margin-top:4px;">已排除「已續保」和「他家承保」</div>' :
                     '<div style="font-size:12px;color:var(--text3);margin-top:4px;">點擊保單可更新續保狀態</div>') +
      '</div>';

    // ★ v6.1 改用統一保單卡片格式
    result.list.forEach(function(item) {
      html += renderPolicyCard(item, isUnrenewed ? 'unrenewed' : 'track');
    });
    list.innerHTML = html;
  }

  // 更新續保狀態面板
  function openRenewTrack(policyNo, name, currentStatus) {
    var ovId = 'renewTrackOverlay';
    var ex   = document.getElementById(ovId); if (ex) document.body.removeChild(ex);
    var ov   = document.createElement('div');
    ov.id    = ovId;
    ov.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:8500;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;';

    var STATUSES = ['已續保','已聯繫','不續保'];
    var btns = STATUSES.map(function(s) {
      var st = _renewStatusStyle(s);
      var isA= (s === currentStatus);
      return '<button onclick="selectRenewStatus(this,\'' + s + '\')" data-status="' + s + '" ' +
        'style="flex:1;padding:10px 4px;border-radius:8px;font-size:13px;font-weight:bold;cursor:pointer;' +
        'background:' + (isA?st.bg:'#F5F5F5') + ';color:' + (isA?st.clr:'#888') + ';border:' + (isA?'2px solid '+st.clr:'1px solid #DDD') + ';">' +
        st.icon + ' ' + s + '</button>';
    }).join('');

    ov.innerHTML =
      '<div style="background:var(--surface);border-radius:16px;padding:24px;max-width:360px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,0.2);">' +
        '<div style="font-size:17px;font-weight:bold;color:#6A1B9A;margin-bottom:4px;">✏️ 更新續保狀態</div>' +
        '<div style="font-size:13px;color:var(--text3);margin-bottom:16px;">' + name + '</div>' +
        '<div id="renewStatusBtns" style="display:flex;gap:8px;margin-bottom:16px;">' + btns + '</div>' +
        '<div style="display:flex;gap:8px;">' +
          '<button id="renewSaveBtn" onclick="saveRenewStatus(\'' + policyNo + '\')" ' +
            'style="flex:2;padding:12px;background:#6A1B9A;color:white;border:none;border-radius:8px;font-size:14px;font-weight:bold;cursor:pointer;">💾 儲存</button>' +
          '<button onclick="document.body.removeChild(document.getElementById(\'renewTrackOverlay\'))" ' +
            'style="flex:1;padding:12px;background:#f5f5f5;color:var(--text2);border:none;border-radius:8px;font-size:14px;cursor:pointer;">關閉</button>' +
        '</div>' +
      '</div>';

    ov._selectedStatus = currentStatus || '';
    document.body.appendChild(ov);
    ov.addEventListener('click', function(e) { if (e.target===ov) document.body.removeChild(ov); });
  }

  function selectRenewStatus(btn, status) {
    var ov = document.getElementById('renewTrackOverlay');
    if (ov) ov._selectedStatus = status;
    document.querySelectorAll('#renewStatusBtns button').forEach(function(b) {
      var s = b.getAttribute('data-status'); var st = _renewStatusStyle(s); var isA = (s===status);
      b.style.background = isA?st.bg:'#F5F5F5'; b.style.color=isA?st.clr:'#888';
      b.style.border     = isA?'2px solid '+st.clr:'1px solid #DDD';
    });
  }

  function saveRenewStatus(policyNo) {
    var ov  = document.getElementById('renewTrackOverlay');
    var status = ov ? (ov._selectedStatus||'') : '';
    if (!status) { alert('請選擇狀態'); return; }
    var btn = document.getElementById('renewSaveBtn');
    if (btn) { btn.textContent='儲存中...'; btn.disabled=true; }

    var doneFn = function(r) {
      if (r && r.success) {
        var o = document.getElementById('renewTrackOverlay'); if (o) document.body.removeChild(o);
        // 顯示成功提示
        var toast = document.createElement('div');
        toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#2E7D32;color:white;padding:10px 24px;border-radius:20px;font-size:14px;font-weight:bold;z-index:9999;box-shadow:0 2px 8px rgba(0,0,0,0.3);';
        toast.textContent = '✅ 已儲存！清單更新中...';
        document.body.appendChild(toast);
        setTimeout(function() { document.body.removeChild(toast); }, 2000);
        // 自動刷新：判斷目前顯示的是哪個清單
        setTimeout(function() {
          var titleEl = document.querySelector('#resultsList .list-header, #resultsList div[style*="font-weight:bold"]');
          var titleText = document.getElementById('resultsList').querySelector('div') ?
            document.getElementById('resultsList').querySelector('div').textContent : '';
          if (titleText.indexOf('近30天') !== -1) {
            loadUnrenewed(); // 刷新近30天未續保名冊
          } else {
            loadExpiryRange(); // 刷新自訂區間
          }
        }, 300);
      } else {
        if (btn) { btn.textContent='💾 儲存'; btn.disabled=false; }
        alert('儲存失敗：' + (r ? (r.msg||'未知錯誤') : '無回應，請確認已部署最新版 Libcode'));
      }
    };
    var failFn = function() { if (btn){btn.textContent='💾 儲存';btn.disabled=false;} alert('連線失敗'); };

    if (_directShellUrl) {
      directGasCall('updateRenewalStatus', { policyNo: policyNo, status: status }, doneFn, failFn);
    } else {
      gasCall('updateRenewalStatus', { policyNo: policyNo, status: status }, doneFn, failFn);
    }
  }

  function quickShareFromTrack(name, type, policyNo, expiry) {
    window._nicknameInsuredId = '';
    withNickname('', name, function(salutation) {
      var msg = salutation + ' 您好！\n\n';
      msg += '您的【' + type + '】保單\n';
      msg += '已於 ' + expiry + ' 到期。\n\n';
      msg += '如需續保或有任何疑問，\n歡迎隨時聯繫 ' + ADVISOR_NAME + '！';
      if (ADVISOR_LINE) msg += '\n📲 LINE：https://line.me/ti/p/' + ADVISOR_LINE;
      shareViaLine(msg);
    });
  }

    // ══════════════════════════════════════════════════════
  // ★ P1：有任意險但無強制險
  // ══════════════════════════════════════════════════════
  function loadMissingCompulsory() {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('resultsList').innerHTML = '';
    var fn = function(result) {
      renderVehicleGapList(result,
        '⚠️ 有任意險但無強制險（法規缺口）',
        '#C62828',
        '缺強制險',
        '#FFEBEE', '#C62828',
        '所有車輛均已投保強制險 ✅'
      );
    };
    var failFn = function() {
      document.getElementById('loading').style.display = 'none';
      document.getElementById('resultsList').innerHTML =
        '<p style="text-align:center;color:#d32f2f;">讀取失敗，請稍後再試</p>';
    };
    if (_directShellUrl) {
      directGasCall('getMissingCompulsory', {}, fn);
    } else {
      gasCall('getMissingCompulsory', {}, fn, failFn);
    }
  }

  // ══════════════════════════════════════════════════════
  // ★ P2：有強制險但無任意險（提案商機）
  // ══════════════════════════════════════════════════════
  function loadMissingVoluntary() {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('resultsList').innerHTML = '';
    var fn = function(result) {
      renderVehicleGapList(result,
        '💡 有強制險但無任意險（提案商機）',
        '#1565C0',
        '提案商機',
        '#E3F2FD', '#1565C0',
        '所有車輛均已投保任意險，保障完整 ✅'
      );
    };
    var failFn = function() {
      document.getElementById('loading').style.display = 'none';
      document.getElementById('resultsList').innerHTML =
        '<p style="text-align:center;color:#d32f2f;">讀取失敗，請稍後再試</p>';
    };
    if (_directShellUrl) {
      directGasCall('getMissingVoluntaryWithProposal', {}, fn);
    } else {
      gasCall('getMissingVoluntaryWithProposal', {}, fn, failFn);
    }
  }

    function loadFireGapList() {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('resultsList').innerHTML = '';
    
    // 【雙軌優化】加入直連與傳統中央判定路由
    if (_directShellUrl) {
      directGasCall('getFireInsuranceGapWithTrack', {}, showFireGapList, function() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('resultsList').innerHTML = '<p style="text-align:center;color:#d32f2f;">讀取失敗，請稍後再試</p>';
      });
    } else {
      gasCall('getFireInsuranceGapWithTrack', {}, showFireGapList, function() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('resultsList').innerHTML = '<p style="text-align:center;color:#d32f2f;">讀取失敗，請稍後再試</p>';
      });
    }
  }

  function showFireGapList(result) {
    document.getElementById('loading').style.display = 'none';
    var list = document.getElementById('resultsList');
    
    // 【防呆優化】如果後端因為虛擬身份或其他原因報錯，先阻斷防止 forEach 崩潰
    if (!result || result.error) {
      list.innerHTML = '<p style="text-align:center;color:#d32f2f;">⚠️ 資料讀取異常：' + (result ? result.error : '未知錯誤') + '</p>';
      return;
    }
    
    // 【 Baker 老師提議優化】當完全沒有資料（total 等於 0 或 list 為空）時，給予溫馨通知
    if (!result.list || result.list.length === 0 || result.total === 0) {
      list.innerHTML = '<div style="text-align:center; padding:30px 20px; background:#E8F5E9; border:1px solid #A5D6A7; border-radius:var(--radius-md); color:#2E7D32; font-weight:bold; margin-top:15px;">' +
        '🎉 恭喜！目前您名下的所有客戶都已經擁有住宅火險保障，暫無缺口名單。' +
        '</div>';
      return;
    }
    
    // 以下保留您原本有資料時的渲染邏輯
    var html = '<div style="background:#FFF3E0;border:1px solid #FFB74D;border-radius:var(--radius-md);padding:14px 16px;margin-bottom:16px;">' +
      '<div style="color:#DC2626;font-weight:bold;font-size:15px;">🏠 尚無住宅火險：共 ' + result.total + ' 人</div>' +
      '<div style="font-size:12px;color:var(--text3);margin-top:4px;">比對方式：身分證 + 地址雙重比對</div>' +
      '</div>';
      
    result.list.forEach(function(item) {
      var encoded   = encodeURIComponent(JSON.stringify({ name: item.name, applicant: item.applicant, address: item.address }));
      var fireKey   = item.idNo || item.insuredId || '';
      var fireName  = item.name || '';
      var firePhone = item.phone || item.insuredPhone || '';
      html += '<div style="background:var(--surface);border-radius:var(--radius-md);padding:14px 16px;margin-bottom:10px;box-shadow:0 2px 6px rgba(0,0,0,0.06);border-left:5px solid #FF9800;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
          '<div>' +
            '<div style="font-weight:bold;font-size:15px;color:var(--text1);">' + item.name + '</div>' +
            (item.trackStatus ? '<div style="margin-top:3px;font-size:11px;font-weight:bold;display:inline-block;padding:2px 8px;border-radius:8px;background:' + _trackStatusStyle(item.trackStatus).bg + ';color:' + _trackStatusStyle(item.trackStatus).clr + ';">' + _trackStatusStyle(item.trackStatus).icon + ' ' + item.trackStatus + '</div>' : '') +
          '</div>' +
          '<div style="display:flex;gap:6px;align-items:center;">' +
            '<button class="fireTrackBtn" data-id="' + fireKey + '" data-name="' + fireName + '" data-phone="' + firePhone + '" data-status="' + (item.trackStatus||'') + '" data-note="' + (item.trackNote||'').replace(/"/g,'&quot;') + '" style="background:#6A1B9A;color:white;border:none;padding:5px 10px;border-radius:6px;font-size:12px;font-weight:bold;cursor:pointer;">📋 追蹤</button>' +
            '<button onclick="recommendFire(\'' + encoded + '\')" style="background:#FF9800;color:white;border:none;padding:6px 12px;border-radius:6px;font-size:12px;font-weight:bold;cursor:pointer;">🏠 推薦住火</button>' +
          '</div>' +
        '</div>' +
        '<div style="font-size:12px;color:var(--text3);">' + item.insType + ' 到期：' + item.expiry +
          (item.applicant && item.applicant !== item.name ? ' 要保人：' + item.applicant : '') + '</div>' +
        (item.address && item.address !== '無' ? '<div style="font-size:11px;color:var(--text3);margin-top:4px;word-break:break-all;">🏠 ' + item.address + '</div>' : '') +
      '</div>';
    });
    list.innerHTML = html;
    list.querySelectorAll('.fireTrackBtn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        openFireTrack(this.dataset.id, this.dataset.name, this.dataset.phone, this.dataset.status, this.dataset.note);
      });
    });
  }

  // ══════════════════════════════════════════════════════
  // ★ 住宅火險追蹤
  // ══════════════════════════════════════════════════════
  function openFireTrack(insuredId, name, phone, currentStatus, currentNote) {
    var overlayId = 'fireTrackOverlay';
    var existing  = document.getElementById(overlayId);
    if (existing) document.body.removeChild(existing);

    var overlay = document.createElement('div');
    overlay.id  = overlayId;
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:8500;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;';

    var STATUSES = ['待追蹤','已通知','報價中','加保成功','不加保','考慮中'];
    var statusBtns = STATUSES.map(function(s) {
      var st = _trackStatusStyle(s);
      var isActive = (s === currentStatus);
      return '<button onclick="selectFireStatus(this,\'' + s + '\')" data-status="' + s + '" ' +
        'style="flex:1;padding:7px 4px;border-radius:8px;font-size:12px;font-weight:bold;cursor:pointer;' +
        'background:' + (isActive ? st.bg : '#F5F5F5') + ';color:' + (isActive ? st.clr : '#888') + ';' +
        'border:' + (isActive ? '2px solid '+st.clr : '1px solid #DDD') + ';">' +
        st.icon + ' ' + s + '</button>';
    }).join('');

    overlay.innerHTML =
      '<div style="background:var(--surface);border-radius:16px;padding:24px;max-width:400px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,0.2);">' +
        '<div style="font-size:17px;font-weight:bold;color:#DC2626;margin-bottom:4px;">🏠 住火追蹤記錄</div>' +
        '<div style="font-size:13px;color:var(--text3);margin-bottom:16px;">' + name + (phone ? '　📞 ' + phone : '') + '</div>' +
        '<div style="font-size:12px;color:var(--text2);font-weight:bold;margin-bottom:8px;">追蹤狀態</div>' +
        '<div id="fireStatusBtns" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;">' + statusBtns + '</div>' +
        '<div style="font-size:12px;color:var(--text2);font-weight:bold;margin-bottom:6px;">備註</div>' +
        '<textarea id="fireTrackNote" rows="3" placeholder="例：已傳訊息、等待回覆；報價 NT$3,000；需要先了解保費..." ' +
          'style="width:100%;box-sizing:border-box;padding:10px;border:1px solid #DDD;border-radius:8px;font-size:14px;resize:vertical;margin-bottom:14px;">' + (currentNote||'') + '</textarea>' +
        '<div style="display:flex;gap:8px;">' +
          '<button id="fireSaveBtn" onclick="saveFireTrack(\'' + insuredId.replace(/'/g,"'") + '\',\'' + name.replace(/'/g,"'") + '\',\'' + (phone||'').replace(/'/g,"'") + '\')" ' +
            'style="flex:2;padding:11px;background:#E65100;color:white;border:none;border-radius:8px;font-size:14px;font-weight:bold;cursor:pointer;">💾 儲存記錄</button>' +
          '<button onclick="document.body.removeChild(document.getElementById(\'fireTrackOverlay\'))" ' +
            'style="flex:1;padding:11px;background:#f5f5f5;color:var(--text2);border:none;border-radius:8px;font-size:14px;cursor:pointer;">關閉</button>' +
        '</div>' +
      '</div>';

    overlay._selectedStatus = currentStatus || '待追蹤';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) document.body.removeChild(overlay);
    });
  }

  function selectFireStatus(btn, status) {
    var overlay = document.getElementById('fireTrackOverlay');
    if (overlay) overlay._selectedStatus = status;
    var btns = document.querySelectorAll('#fireStatusBtns button');
    btns.forEach(function(b) {
      var s  = b.getAttribute('data-status');
      var st = _trackStatusStyle(s);
      var isActive = (s === status);
      b.style.background = isActive ? st.bg : '#F5F5F5';
      b.style.color       = isActive ? st.clr : '#888';
      b.style.border      = isActive ? '2px solid '+st.clr : '1px solid #DDD';
    });
  }

  function saveFireTrack(insuredId, name, phone) {
    var overlay = document.getElementById('fireTrackOverlay');
    var status  = overlay ? (overlay._selectedStatus || '待追蹤') : '待追蹤';
    var note    = document.getElementById('fireTrackNote') ? document.getElementById('fireTrackNote').value.trim() : '';
    var saveBtn = document.getElementById('fireSaveBtn');
    if (saveBtn) { saveBtn.textContent = '儲存中...'; saveBtn.disabled = true; }

    var params = { insuredId: insuredId, name: name, phone: phone, address: '', status: status, note: note };
    var doneFn = function(result) {
      if (result && result.success) {
        var ov = document.getElementById('fireTrackOverlay');
        if (ov) document.body.removeChild(ov);
        loadFireGapList(); // 重新載入更新狀態
      } else {
        if (saveBtn) { saveBtn.textContent = '💾 儲存記錄'; saveBtn.disabled = false; }
        alert('儲存失敗，請稍後再試');
      }
    };
    var failFn = function() {
      if (saveBtn) { saveBtn.textContent = '💾 儲存記錄'; saveBtn.disabled = false; }
      alert('連線失敗，請重試');
    };
    if (_directShellUrl) {
      directGasCall('saveFireTrackRecord', params, doneFn, failFn);
    } else {
      gasCall('saveFireTrackRecord', params, doneFn, failFn);
    }
  }

    function recommendFire(encodedData) {
    var data = JSON.parse(decodeURIComponent(encodedData));
    var targetName = (data.applicant && data.applicant !== data.name) ? data.applicant : data.name;
    window._nicknameInsuredId = '';
    withNickname('', targetName, function(salutation) {
      var msg = salutation + ' 您好！\n\n';
      msg += '🏠【住宅火險保障提醒】\n\n';
      if (data.address) msg += '您居住的地址：' + data.address + '\n';
      msg += '目前系統中未查到您的住宅火險記錄。\n\n';
      msg += '⚠️ 住宅可能轉嫁的風險有：\n';
      msg += '　• 火災、爆炸 → 財物損失難以估計\n';
      msg += '　• 颱風、洪水 → 台灣每年均有颱風\n';
      msg += '　• 竊盜 → 室內財物一夕損失\n';
      msg += '　• 漏水責任 → 影響樓下鄰居\n\n';
      msg += '💡 住宅火險 vs 車險的差異：\n';
      msg += '　✅ 保費極低（年繳約 NT$1,000～3,000）\n';
      msg += '　✅ 建築物＋動產皆可投保\n';
      msg += '　✅ 天災、意外、竊盜全方位保障\n';
      msg += '　✅ 租屋族也適合（動產險）\n\n';
      msg += '🏡 您的家值得完善保護！\n';
      msg += '如需了解詳情或資料，請聯繫我們 ' + ADVISOR_NAME + '！🙌';
      if (ADVISOR_LINE) msg += '\n📲 LINE：https://line.me/ti/p/' + ADVISOR_LINE;
      shareViaLine(msg);
    });
  }

  // ══════════════════════════════════════════════════════
  // ★ 旅平卡推薦話術
  // ══════════════════════════════════════════════════════
  // ★ shareTravelRecommend 已移除（2026/07）：邏輯上不合理——
  //   使用者當時是在「查看已存在的旅平卡明細」，對已經持有
  //   旅平卡的保戶推薦旅平卡沒有意義，故直接拿掉這個功能，
  //   而不是修復它。如果之後想找回，可從 git 歷史還原這段程式碼。


// ══════════════════════════════════════════════════════
// ★ 把 index.html 內 onclick="..." 會呼叫到的函式，以及被
//   尚未拆分的 policy-render／auth 區塊直接呼叫的函式，expose 到全域
// ══════════════════════════════════════════════════════
window.toggleExpiryPanel     = toggleExpiryPanel;
window.openDatePicker        = openDatePicker;
window.confirmDatePicker     = confirmDatePicker;
window.closeDatePicker       = closeDatePicker;
window.setDateRange          = setDateRange;
window.loadExpiryRange       = loadExpiryRange;
window.loadUnrenewed         = loadUnrenewed;
window.selectRenewStatus     = selectRenewStatus;
window.saveRenewStatus       = saveRenewStatus;
window.loadMissingCompulsory = loadMissingCompulsory;
window.loadMissingVoluntary  = loadMissingVoluntary;
window.loadFireGapList       = loadFireGapList;
window.selectFireStatus      = selectFireStatus;
window.saveFireTrack         = saveFireTrack;
window.recommendFire         = recommendFire;
window._renewStatusStyle     = _renewStatusStyle;
window.initTrackDates        = initTrackDates;
window.quickShareFromTrack   = quickShareFromTrack;
