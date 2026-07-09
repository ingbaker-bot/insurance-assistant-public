// ══════════════════════════════════════════════════════
// tabs-search.js — Tab切換、產險/旅平搜尋（ES Module）
// 原本位於 index.html 第 1878–2281 行，拆分示範
// 依賴（來自尚未拆分的其他區塊，皆為全域變數/函式，載入順序已確保先於本模組執行）：
//   gasCall, directGasCall, _directShellUrl, ADVISOR_NAME,
//   openDetail, openTravelDetail（定義於尚未拆分的 modal 區塊）,
//   fmtDate（定義於尚未拆分的 policy-render 區塊）, shareViaLine
// ══════════════════════════════════════════════════════

  // ── Tab 切換 ──
  function switchTab(tab) {
    var insEl = document.getElementById('insuranceSearch');
    var trvEl = document.getElementById('travelSearch');
    var alreadyOpen = (tab === 'insurance' && insEl && insEl.style.display === 'block') ||
                       (tab === 'travel'    && trvEl && trvEl.style.display === 'block');

    document.getElementById('resultsList').innerHTML = '';

    if (alreadyOpen) {
      // ★ 再點一次已展開的頁籤 → 收回
      currentTab = null;
      document.getElementById('tabInsurance').className = 'tab-btn';
      document.getElementById('tabTravel').className    = 'tab-btn';
      if (insEl) insEl.style.display = 'none';
      if (trvEl) trvEl.style.display = 'none';
    } else {
      currentTab = tab;
      document.getElementById('tabInsurance').className = 'tab-btn' + (tab === 'insurance' ? ' active-insurance' : '');
      document.getElementById('tabTravel').className    = 'tab-btn' + (tab === 'travel'    ? ' active-travel'    : '');
      // ★ v6.2：預設收合，點Tab才展開
      if (insEl) insEl.style.display = (tab === 'insurance') ? 'block' : 'none';
      if (trvEl) trvEl.style.display = (tab === 'travel')    ? 'block' : 'none';
    }

    // 切換 Tab 時關閉所有展開面板
    ['caliQuickPanel','strokePanel','inspectionPanel','searchPanel'].forEach(function(id) {
      var el = document.getElementById(id); if (el) el.style.display = 'none';
    });
    ['btnCali','btn2stroke','btnInspection','btnSearch'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) { el.style.opacity='1'; el.style.outline='none'; }
    });
  }

  // ── 產險搜尋 ──
  function handleEnterInsurance(e) { if (e.key === 'Enter') handleSearch(); }
  function handleSearch() {
    var val = document.getElementById('smartSearch').value.trim();
    if (!val) return alert('請輸入搜尋條件');
    document.getElementById('loading').style.display = 'block';
    document.getElementById('resultsList').innerHTML = '';
    
    var showAllChk = document.getElementById('showAllToggle');
    var showAll    = showAllChk ? showAllChk.checked : false;
    var params     = { q: val, showAll: showAll };
    var failFn2    = function() {
      document.getElementById('loading').style.display = 'none';
      document.getElementById('resultsList').innerHTML = '<p style="text-align:center;color:var(--text3);">搜尋失敗，請稍後再試</p>';
    };
    if (_directShellUrl) {
      directGasCall('searchPolicies', params, showResults, failFn2);
    } else {
      gasCall('searchPolicies', params, showResults, failFn2);
    }
  }

  function showResults(data) {
    document.getElementById('loading').style.display = 'none';
    var list = document.getElementById('resultsList');
    if (!data || data.length === 0) { list.innerHTML = '<p style="text-align:center;color:var(--text3);">查無資料。</p>'; return; }
    var today = new Date(); today.setHours(0,0,0,0);
    var html = '';
    
    data.forEach(function(item) {
      var agentTag  = item.agentCode && item.agentCode !== '無' ? ' <span style="color:#FF9800;font-weight:bold;">[' + item.agentCode + ']</span>' : '';
      var renewTag  = item.renewStatus === '已報廢' ? ' <span style="background:#BDBDBD;color:#fff;font-size:10px;padding:1px 7px;border-radius:8px;">🗑️ 已報廢</span>' :
                      item.renewStatus === '已過戶' ? ' <span style="background:#78909C;color:#fff;font-size:10px;padding:1px 7px;border-radius:8px;">🔄 已過戶</span>' : '';

      // 計算剩餘天數
      var daysHtml = '';
      if (item.expiry && item.expiry !== '無') {
        var parts = item.expiry.split('/');
        if (parts.length === 3) {
          var y = parseInt(parts[0]); if (y < 1911) y += 1911;
          var exp = new Date(y, parseInt(parts[1])-1, parseInt(parts[2]));
          var daysLeft = Math.ceil((exp - today) / 86400000);
          var dayColor = daysLeft <= 5 ? '#C62828' : daysLeft <= 30 ? '#E65100' : daysLeft <= 60 ? '#F57F17' : '#2E7D32';
          var dayBg    = daysLeft <= 5 ? '#FFEBEE' : daysLeft <= 30 ? '#FFF3E0' : daysLeft <= 60 ? '#FFF8E1' : '#E8F5E9';
          daysHtml = daysLeft < 0
            ? '<span style="background:#F5F5F5;color:#9E9E9E;font-size:11px;font-weight:bold;padding:2px 8px;border-radius:var(--radius-md);">已到期</span>'
            : '<span style="background:' + dayBg + ';color:' + dayColor + ';font-size:11px;font-weight:bold;padding:2px 8px;border-radius:var(--radius-md);">剩 ' + daysLeft + ' 天</span>';
        }
      }

      // 【核心修正】修正 quickShare 括號內的變數名稱，對齊 Library 的回傳特徵
      // 原本 item.effectDate -> 修正為 item.effectiveDate
      // 原本 item.totalPremium -> 修正為 item.premium
      html += '<div class="card" onclick="openDetail(\'' + item.policyNo + '\')">' +
        '<div style="margin-bottom:10px;">' +
          '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px;margin-bottom:6px;">' +
            '<div class="card-title" style="margin-bottom:0;font-size:16px;flex:1;min-width:0;word-break:break-word;">' + item.name + agentTag + renewTag + '</div>' +
            '<div style="display:flex;gap:4px;align-items:center;flex-shrink:0;">' +
              daysHtml +
              '<div class="status-badge">' + item.status + '</div>' +
            '</div>' +
          '</div>' +
          '<div style="font-size:13px;color:var(--text2);">' + item.type + '</div>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">' +
          '<div>' +
            '<div style="color:#00A3C4;font-size:12px;font-weight:bold;margin-bottom:4px;">👤 被保人</div>' +
            '<div class="card-info" style="word-break:break-all;">🆔 ' + item.maskedId + '</div>' +
            '<div class="card-info">🎂 ' + item.birthday + '</div>' +
            (item.insuredPhone && item.insuredPhone !== '無' ? '<div class="card-info">📱 ' + item.insuredPhone + '</div>' : '') +
            '<div class="card-info">🚗 ' + item.plateNo + '</div>' +
            '<div class="card-info">📅 ' + item.expiry + '</div>' +
          '</div>' +
          '<div>' +
            '<div style="color:#00A3C4;font-size:12px;font-weight:bold;margin-bottom:4px;">📞 要保人</div>' +
            '<div class="card-info">' + item.applicantName + '</div>' +
            (item.applicantId && item.applicantId !== '無' ? '<div class="card-info">🪪 ' + item.applicantId + '</div>' : '') +
            '<div class="card-info">' + item.applicantPhone + '</div>' +
            '<div class="card-info" style="word-break:break-all;font-size:12px;">🏠 ' + item.address + '</div>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;gap:8px;padding-top:10px;border-top:1px dashed #eee;">' +
          '<button onclick="event.stopPropagation();openDetail(\'' + item.policyNo + '\')" style="flex:1;background:#00A3C4;color:white;border:none;padding:10px;border-radius:6px;font-weight:bold;font-size:14px;cursor:pointer;">🔍 查看明細</button>' +
          '<button onclick="event.stopPropagation();quickShare(\'' + item.name + '\',\'' + item.type + '\',\'' + item.policyNo + '\',\'' + item.effectiveDate + '\',\'' + item.expiry + '\',\'' + item.plateNo + '\',\'' + item.premium + '\',\'' + item.maskedId + '\')" style="flex:1;background:#00B900;color:white;border:none;padding:10px;border-radius:6px;font-weight:bold;font-size:14px;cursor:pointer;">💬 傳到期提醒</button>' +
        '</div>' +
      '</div>';
    });
    list.innerHTML = html;
  }

  // ── 未申辦旅平卡名單 ──
  var uncoveredAllList = []; // 儲存完整名單供搜尋用

  function loadUncoveredList() {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('resultsList').innerHTML = '';
    
    // 【雙軌優化】如果是直連模式，直接找個人薄殼要未申辦名單；否則走傳統中央驗證
    if (_directShellUrl) {
      directGasCall('getUncoveredList', {}, showUncoveredList, function() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('resultsList').innerHTML = '<p style="text-align:center;color:#d32f2f;">讀取失敗，請確認網路連線</p>';
      });
    } else {
      gasCall('getUncoveredList', {}, showUncoveredList, function() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('resultsList').innerHTML = '<p style="text-align:center;color:#d32f2f;">讀取失敗，請先執行「比對旅平卡覆蓋率」</p>';
      });
    }
  }

  function showUncoveredList(result) {
    document.getElementById('loading').style.display = 'none';
    var list = document.getElementById('resultsList');

    if (result.error) {
      list.innerHTML = '<div style="text-align:center;color:#DC2626;padding:20px;background:#FBE9E7;border-radius:var(--radius-md);">' +
        '⚠️ ' + result.error + '<br><br>' +
        '<small>請到 Sheets 選單執行「🔍 比對旅平卡覆蓋率」後再試</small></div>';
      return;
    }
    if (!result.list || result.list.length === 0) {
      list.innerHTML = '<p style="text-align:center;color:#2E7D32;font-weight:bold;">🎉 所有客戶都已申辦旅平卡！</p>';
      return;
    }

    uncoveredAllList = result.list;

    var html =
      '<div class="uncovered-header">' +
        '<div style="color:#DC2626;font-weight:bold;">❌ 未申辦旅平卡：共 ' + result.total + ' 人</div>' +
        '<div style="font-size:12px;color:var(--text3);">點擊推薦按鈕傳送訊息</div>' +
      '</div>' +
      '<input class="uncovered-search" type="text" placeholder="輸入姓名快速篩選..." ' +
        'oninput="filterUncovered(this.value)" />' +
      '<div id="uncoveredListBody"></div>';

    list.innerHTML = html;
    renderUncoveredCards(uncoveredAllList);
  }

  function filterUncovered(keyword) {
    if (!keyword.trim()) {
      renderUncoveredCards(uncoveredAllList);
      return;
    }
    var filtered = uncoveredAllList.filter(function(item) {
      return item.name.includes(keyword) || item.applicant.includes(keyword) ||
             item.insType.includes(keyword);
    });
    renderUncoveredCards(filtered);
  }

  function renderUncoveredCards(list) {
    var html = '';
    if (list.length === 0) {
      html = '<p style="text-align:center;color:var(--text3);">無符合資料</p>';
    } else {
      list.forEach(function(item) {
        // 把資料 encode 傳給推薦函式
        var encoded = encodeURIComponent(JSON.stringify({ name: item.name, applicant: item.applicant, idNo: item.idNo || '' }));
        html +=
          '<div class="uncovered-card">' +
            '<div class="uncovered-info">' +
              '<div class="uncovered-name">' + item.name + '</div>' +
              '<div class="uncovered-detail">' +
                item.insType + '　到期：' + item.expiry +
                (item.applicant && item.applicant !== item.name ? '　要保人：' + item.applicant : '') +
              '</div>' +
            '</div>' +
            '<div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;">' +
              '<button class="uncovered-recommend-btn" onclick="recommendTravel(\'' + encoded + '\')">💬 推薦旅平卡</button>' +
              '<div style="display:flex;gap:4px;">' +
                '<button onclick="setUncoveredStatus(\'' + encoded + '\',\'已完成\')" ' +
                  'style="padding:5px 8px;background:#E8F5E9;color:#2E7D32;border:1px solid #A5D6A7;border-radius:6px;font-size:11px;cursor:pointer;">✅ 已完成</button>' +
                '<button onclick="setUncoveredStatus(\'' + encoded + '\',\'不辦理\')" ' +
                  'style="padding:5px 8px;background:#F5F5F5;color:var(--text2);border:1px solid #DDD;border-radius:6px;font-size:11px;cursor:pointer;">✗ 不辦理</button>' +
                '<button onclick="setUncoveredStatus(\'' + encoded + '\',\'刪除\')" ' +
                  'style="padding:5px 8px;background:#FFEBEE;color:#C62828;border:1px solid #FFCDD2;border-radius:6px;font-size:11px;cursor:pointer;">🗑️</button>' +
              '</div>' +
            '</div>' +
          '</div>';
      });
    }
    document.getElementById('uncoveredListBody').innerHTML = html;
  }

  // ★ v7.2 旅平卡推薦 - 加入稱呼輸入
  var _travelRecommendData = null;

  function recommendTravel(encodedData) {
    _travelRecommendData = JSON.parse(decodeURIComponent(encodedData));
    var targetName = (_travelRecommendData.applicant && _travelRecommendData.applicant !== _travelRecommendData.name)
      ? _travelRecommendData.applicant : _travelRecommendData.name;

    // 查詢已儲存的稱呼
    var idNo = _travelRecommendData.idNo || '';
    if (idNo && _directShellUrl) {
      directGasCall('getCustomerNickname', { id: idNo }, function(r) {
        _showTravelNickModal(targetName, r && r.nickname ? r.nickname : '');
      }, function() { _showTravelNickModal(targetName, ''); });
    } else if (idNo) {
      gasCall('getCustomerNickname', { id: idNo }, function(r) {
        _showTravelNickModal(targetName, r && r.nickname ? r.nickname : '');
      }, function() { _showTravelNickModal(targetName, ''); });
    } else {
      _showTravelNickModal(targetName, '');
    }
  }

  function _showTravelNickModal(name, savedNick) {
    document.getElementById('travelNickName').textContent  = name;
    document.getElementById('travelNickInput').value       = savedNick;
    document.getElementById('travelNickModal').style.display = 'flex';
    setTimeout(function(){ document.getElementById('travelNickInput').focus(); }, 150);
  }

  function _confirmTravelRecommend() {
    var data = _travelRecommendData;
    if (!data) return;
    var targetName = (data.applicant && data.applicant !== data.name)
      ? data.applicant : data.name;
    var nick  = document.getElementById('travelNickInput').value.trim();
    var greet = nick || targetName;

    var msg =
      "🏖️【旅平卡推薦】\n\n" +
      greet + " 您好！我們注意到您目前尚未申辦旅平卡保障。\n\n" +
      "富邦人壽及產險均有提供旅平卡，保障內容包含：\n" +
      "✅ 意外身故／失能保障\n" +
      "✅ 海內外旅遊醫療費用\n" +
      "✅ 海外突發疾病\n" +
      "✅ 產險更有不便險\n\n" +
      "有興趣了解詳情，歡迎隨時聯繫 " + ADVISOR_NAME + "！🙌";
    if (ADVISOR_LINE) msg += "\n📲 加入 LINE：https://line.me/ti/p/" + ADVISOR_LINE;

    // 儲存稱呼
    var idNo = data.idNo || '';
    if (nick && idNo) {
      if (_directShellUrl) directGasCall('saveCustomerNickname', { id: idNo, nick: nick }, null, null);
      else gasCall('saveCustomerNickname', { id: idNo, nick: nick }, null, null);
    }

    document.getElementById('travelNickModal').style.display = 'none';
    _travelRecommendData = null;
    shareViaLine(msg);
  }

  function _cancelTravelRecommend() {
    document.getElementById('travelNickModal').style.display = 'none';
    _travelRecommendData = null;
  }

  function _skipTravelNick() {
    var data = _travelRecommendData;
    if (!data) return;
    var targetName = (data.applicant && data.applicant !== data.name)
      ? data.applicant : data.name;
    // 用姓名直接發送
    var nick = targetName;
    var msg =
      "🏖️【旅平卡推薦】\n\n" +
      nick + " 您好！我們注意到您目前尚未申辦旅平卡保障。\n\n" +
      "富邦人壽及產險均有提供旅平卡，保障內容包含：\n" +
      "✅ 意外身故／失能保障\n" +
      "✅ 海內外旅遊醫療費用\n" +
      "✅ 海外突發疾病\n" +
      "✅ 產險更有不便險\n\n" +
      "有興趣了解詳情，歡迎隨時聯繫 " + ADVISOR_NAME + "！🙌";
    if (ADVISOR_LINE) msg += "\n📲 加入 LINE：https://line.me/ti/p/" + ADVISOR_LINE;
    document.getElementById('travelNickModal').style.display = 'none';
    _travelRecommendData = null;
    shareViaLine(msg);
  }

  // ★ v7.2 設定未申辦旅平卡名單狀態（已完成/不辦理/刪除）
  function setUncoveredStatus(encodedData, status) {
    var data = JSON.parse(decodeURIComponent(encodedData));
    var idNo = data.idNo || '';
    var name = data.name || '';

    if (!idNo) {
      // 無身分證號：直接從畫面移除（不儲存）
      _removeUncoveredCard(name);
      showBdToast('已移除：' + name);
      return;
    }

    // 儲存狀態到 GAS
    var onOk = function() {
      _removeUncoveredCard(name);
      showBdToast(status === '刪除' ? '🗑️ 已刪除：' + name :
                  status === '已完成' ? '✅ 已完成：' + name : '✗ 不辦理：' + name);
    };
    var params = { idNo: idNo, name: name, status: status };
    if (_directShellUrl) directGasCall('updateTravelRecommendStatus', params, onOk, onOk);
    else                 gasCall('updateTravelRecommendStatus', params, onOk, onOk);
  }

  function _removeUncoveredCard(name) {
    // 從畫面上移除該筆卡片
    var cards = document.querySelectorAll('.uncovered-card');
    cards.forEach(function(card) {
      var nameEl = card.querySelector('.uncovered-name');
      if (nameEl && nameEl.textContent.trim() === name) {
        card.style.transition = 'opacity 0.3s';
        card.style.opacity = '0';
        setTimeout(function(){ card.remove(); }, 300);
      }
    });
  }

  // ── 旅平卡搜尋 ──
  function handleEnterTravel(e) { if (e.key === 'Enter') handleTravelSearch(); }
  function handleTravelSearch() {
    var val = document.getElementById('travelSearchInput').value.trim();
    if (!val) return alert('請輸入搜尋條件');
    document.getElementById('loading').style.display = 'block';
    document.getElementById('resultsList').innerHTML = '';
    
    // 【雙軌優化】如果直連網址存在，走直連搜尋；否則走傳統中央轉發
    if (_directShellUrl) {
      directGasCall('searchTravelCards', { q: val }, showTravelResults);
    } else {
      if (_directShellUrl) {
        directGasCall('searchTravelCards', { q: val }, showTravelResults, function() {
          document.getElementById('loading').style.display = 'none';
          document.getElementById('resultsList').innerHTML = '<p style="text-align:center;color:var(--text3);">搜尋失敗，請稍後再試</p>';
        });
      } else {
        gasCall('searchTravelCards', { q: val }, showTravelResults);
      }
    }
  }
  function showTravelResults(data) {
    document.getElementById('loading').style.display = 'none';
    var list = document.getElementById('resultsList');
    if (!data || data.length === 0) { list.innerHTML = '<p style="text-align:center;color:var(--text3);">查無資料。</p>'; return; }
    var html = '';
    data.forEach(function(item) {
      var agentTag = item.agentCode ? " <span style='color:#FF9800;font-weight:bold;'>[" + item.agentCode + "]</span>" : "";

      // ✅ matchHint 必須在 forEach 內，item 才存在
      var matchHint = (item.matchedMembers && item.matchedMembers.length > 0)
        ? "<div style='color:#FF7043;font-size:12px;margin-top:6px;padding:4px 8px;background:#FBE9E7;border-radius:4px;'>🔍 附加被保人：" +
          item.matchedMembers.map(function(m){ return m.name + '（' + m.relation + '）'; }).join('、') +
          "</div>"
        : "";

      html += "<div class='travel-card' onclick='openTravelDetail(\"" + item.certNo + "\")'>" +
        "<div style='display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;'>" +
          "<div class='travel-card-title'>" + item.appName + agentTag + "</div>" +
          "<div>" +
            "<span class='travel-badge'>" + item.cardType + "</span>" +
            "<span class='member-count-badge'>👥 " + item.memberCount + " 人</span>" +
          "</div>" +
        "</div>" +
        "<div style='display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px;color:var(--text2);'>" +
          "<div>🆔 " + item.appId + "</div>" +
          "<div>📱 " + (item.phone1 || '—') + "</div>" +
          "<div>📅 生效：" + fmtDate(item.effDate) + "</div>" +
          "<div>📋 憑證：" + item.certNo + "</div>" +
        "</div>" +
        "<div style='margin-top:8px;font-size:12px;color:var(--text3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;'>🏠 " + item.address + "</div>" +
        matchHint +
      "</div>";
    });
    list.innerHTML = html;
  }

// ══════════════════════════════════════════════════════
// ★ 把 index.html 內 onclick="..." 會呼叫到的函式 expose 到全域
// ══════════════════════════════════════════════════════
window.switchTab               = switchTab;
window.handleEnterInsurance    = handleEnterInsurance;
window.handleSearch            = handleSearch;
window.loadUncoveredList       = loadUncoveredList;
window.filterUncovered         = filterUncovered;
window.recommendTravel         = recommendTravel;
window._confirmTravelRecommend = _confirmTravelRecommend;
window._skipTravelNick         = _skipTravelNick;
window.setUncoveredStatus      = setUncoveredStatus;
window.handleEnterTravel       = handleEnterTravel;
window.handleTravelSearch      = handleTravelSearch;
