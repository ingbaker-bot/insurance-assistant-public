// ══════════════════════════════════════════════════════
// cali-opportunity.js — CALI強制險查詢、商機提案話術（ES Module）
// 原本位於 index.html 第 2185–3016 行，拆分示範
// 依賴（來自尚未拆分的其他區塊，皆為全域變數/函式，載入順序已確保先於本模組執行）：
//   gasCall, directGasCall, _directShellUrl, ADVISOR_NAME, showBdToast, renderModal
// 本模組的 renderVehicleGapList、_trackStatusStyle 被尚未拆分的
// expiry-fire 區塊（到期保單追蹤）直接呼叫，務必 expose 到全域
// ══════════════════════════════════════════════════════

  // ══════════════════════════════════════════════════════
  // ★ 無住宅火險名單
  // ══════════════════════════════════════════════════════

  // ══════════════════════════════════════════════════════
  // ★ CALI 查詢輔助：開新分頁並自動填入身分證 + 車牌
  // ══════════════════════════════════════════════════════
  function openCaliQuery(idNo, plate) {
    var win = window.open('https://ecard.cali.org.tw/PPCP_QRY/', '_blank');
    if (!win) { alert('請允許彈出視窗'); return; }
    // 注入自動填入腳本（需等頁面載入完成）
    var checkInterval = setInterval(function() {
      try {
        var doc = win.document;
        if (!doc || !doc.readyState || doc.readyState !== 'complete') return;
        clearInterval(checkInterval);
        // 填入身分證字號
        var idField = doc.querySelector('input[name="idNo"], input[id*="id"], input[type="text"]');
        if (idField) idField.value = idNo;
        // 填入車牌（選「車牌號碼」radio）
        var plateRadio = doc.querySelector('input[value*="plate"], input[name*="qryType"]');
        if (plateRadio) plateRadio.click();
        var plateField = doc.querySelectorAll('input[type="text"]')[1];
        if (plateField) plateField.value = plate.replace(/([A-Z0-9]+)([A-Z0-9]+)/, '$1-$2');
      } catch(e) {
        clearInterval(checkInterval);
      }
    }, 500);
    setTimeout(function() { clearInterval(checkInterval); }, 10000);
  }

  // ── 顯示 CALI 查詢卡片（通用）──
  // 車牌格式化（加橫槓）：NLN5937→NLN-5937, BBF2205→BBF-2205, ABC1234→ABC-1234
  function formatPlate(plate) {
    if (!plate) return plate;
    // 已有橫槓不處理
    if (plate.indexOf('-') !== -1) return plate;
    // 台灣一般車牌：3英文+4數字 或 2英文+4數字 或 3英文+2數字+1英 等
    // 通用規則：找英文與數字的分界點加橫槓
    var m = plate.match(/^([A-Z]{2,3})([0-9]{4})$/)    // ABC1234, NLN5937
           || plate.match(/^([A-Z]{2,3})([0-9A-Z]{3,4})$/); // 機車 BGX6789
    if (m) return m[1] + '-' + m[2];
    // 數字+英文型（舊式）：1234AB → 1234-AB
    var m2 = plate.match(/^([0-9]{4})([A-Z]{2})$/);
    if (m2) return m2[1] + '-' + m2[2];
    return plate;
  }

  function renderVehicleGapList(result, title, titleColor, badgeText, badgeBg, badgeClr, promptText) {
    document.getElementById('loading').style.display = 'none';
    var list = document.getElementById('resultsList');
    if (!result || result.total === 0) {
      list.innerHTML = '<div style="background:#E8F5E9;border:1px solid #A5D6A7;border-radius:var(--radius-md);padding:14px 16px;font-weight:bold;color:#2E7D32;text-align:center;">🎉 ' + promptText + '</div>';
      return;
    }

    var html = '<div style="background:' + badgeBg + ';border:1px solid ' + badgeClr + ';border-radius:var(--radius-md);padding:14px 16px;margin-bottom:16px;">' +
      '<div style="color:' + titleColor + ';font-weight:bold;font-size:15px;">' + title + '：共 ' + result.total + ' 台</div>' +
      '<div style="font-size:12px;color:var(--text3);margin-top:4px;">比對方式：以車牌號碼為基準，僅計算有效保單</div>' +
      '</div>';

    result.list.forEach(function(item) {
      var displayId   = item.insuredId || item.appId || '';
      var displayName = item.insuredNm || item.appName || '';
      var displayPhone= item.appPhone  || '';
      var plateDisplay= formatPlate(item.plate); // 加橫槓

      var agentTag = (item.agentCode && item.agentCode !== '無' && item.agentCode !== '')
        ? ' <span style="color:#FF9800;font-weight:bold;font-size:14px;">[' + item.agentCode + ']</span>' : '';

      html += '<div style="background:var(--surface);border-radius:var(--radius-md);padding:14px 16px;margin-bottom:10px;' +
        'box-shadow:0 2px 6px rgba(0,0,0,0.06);border-left:5px solid ' + titleColor + ';">' +
        // 車牌 + 業務員代號 + 狀態 badge
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
          '<div style="font-weight:bold;font-size:17px;color:var(--text1);letter-spacing:1px;">🚗 ' + plateDisplay + agentTag + '</div>' +
          '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">' +
            '<div style="background:' + badgeBg + ';color:' + titleColor + ';font-size:11px;font-weight:bold;' +
              'padding:3px 10px;border-radius:var(--radius-md);border:1px solid ' + titleColor + ';">' + badgeText + '</div>' +
            (item.trackStatus ? '<div style="font-size:10px;padding:2px 8px;border-radius:8px;font-weight:bold;' +
              'background:' + _trackStatusStyle(item.trackStatus).bg + ';color:' + _trackStatusStyle(item.trackStatus).clr + ';">' +
              _trackStatusStyle(item.trackStatus).icon + ' ' + item.trackStatus + '</div>' : '') +
          '</div>' +
        '</div>' +
        // 客戶資訊
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:10px;font-size:13px;color:var(--text2);">' +
          '<div>👤 ' + displayName + '</div>' +
          '<div>📞 ' + (displayPhone || '—') + '</div>' +
          '<div>🆔 ' + (displayId    || '—') + '</div>' +
          '<div>📋 ' + item.insType  + '</div>' +
          '<div>📅 到期：' + item.expiry + '</div>' +
          '<div></div>' +
        '</div>' +
        // 按鈕列
        '<div style="display:flex;gap:6px;flex-wrap:wrap;">';

      // 查看明細（用保單號查詢）
      if (item.policyNo) {
        var safePno = item.policyNo.replace(/'/g, '');
        html += '<button onclick="openDetailFromGap(\'' + safePno + '\')" ' +
          'style="flex:1;min-width:80px;background:#00A3C4;color:white;border:none;padding:9px 6px;border-radius:6px;' +
          'font-size:13px;font-weight:bold;cursor:pointer;">🔍 查看明細</button>';
      }
      // 追蹤記錄按鈕（提案商機用）—— 用 data-* 屬性傳資料，避免引號問題
      if (item.trackStatus !== undefined) {
        var trackIdx = html.length; // 用於產生唯一 ID
        html += '<button class="proposalTrackBtn" ' +
          'data-plate="' + item.plate + '" ' +
          'data-name="' + displayName + '" ' +
          'data-id="' + displayId + '" ' +
          'data-type="' + item.insType + '" ' +
          'data-expiry="' + (item.expiry||"") + '" ' +
          'data-status="' + (item.trackStatus||"") + '" ' +
          'data-note="' + (item.trackNote||"").replace(/"/g,"&quot;") + '" ' +
          'style="flex:1;min-width:80px;background:#6A1B9A;color:white;border:none;padding:9px 6px;border-radius:6px;font-size:13px;font-weight:bold;cursor:pointer;">📋 追蹤</button>';
      }

      // CALI 查詢（顯示提示框含資訊）
      if (displayId) {
        var safeId    = displayId.replace(/'/g, '');
        var safePlate = item.plate.replace(/'/g, '');
        var safeName  = displayName.replace(/'/g, '');
        html += '<button onclick="showCaliHint(\'' + safeId + '\',\'' + safePlate + '\',\'' + safeName + '\')" ' +
          'style="flex:1;min-width:80px;background:#00796B;color:white;border:none;padding:9px 6px;border-radius:6px;' +
          'font-size:13px;font-weight:bold;cursor:pointer;">📋 CALI查詢</button>';
      }

      // 傳提醒（帶稱呼）
      var pno       = (item.policyNo || '').replace(/'/g, '');
      var safeIdS   = displayId.replace(/'/g, '');
      var safeNameS = displayName.replace(/'/g, '');
      var safeTypeS = item.insType.replace(/'/g, '');
      var safeExpS  = (item.expiry  || '').replace(/'/g, '');
      var safePlS   = plateDisplay.replace(/'/g, '');
      html += '<button onclick="shareVehicleReminder(\'' + safeIdS + '\',\'' + safeNameS + '\',\'' + safeTypeS + '\',\'' + safeExpS + '\',\'' + safePlS + '\')" ' +
        'style="flex:1;min-width:80px;background:#00B900;color:white;border:none;padding:9px 6px;border-radius:6px;' +
        'font-size:13px;font-weight:bold;cursor:pointer;">💬 傳提醒</button>';

      html += '</div></div>';
    });
    list.innerHTML = html;
    // 事件委派：處理 proposalTrackBtn 點擊（data-* 傳參，避免引號問題）
    list.querySelectorAll('.proposalTrackBtn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        openProposalTrack(
          this.dataset.plate,
          this.dataset.name,
          this.dataset.id,
          this.dataset.type,
          this.dataset.expiry,
          this.dataset.status,
          this.dataset.note
        );
      });
    });
  }

  // ── 從缺口清單查看明細（查完後可返回）──
  function openDetailFromGap(policyNo) {
    // 儲存目前結果列表，查完後可返回
    _gapListBackup = document.getElementById('resultsList').innerHTML;
    document.getElementById('loading').style.display = 'block';
    document.getElementById('resultsList').innerHTML = '';
    var fetchFn = function(data) { renderModal(data, true); }; // true = 顯示返回按鈕
    if (_directShellUrl) {
      directGasCall('getPolicyDetails', { no: policyNo }, fetchFn);
    } else {
      gasCall('getPolicyDetails', { no: policyNo }, fetchFn, function() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('resultsList').innerHTML = _gapListBackup || '';
        alert('讀取保單詳情失敗');
      });
    }
  }
  var _gapListBackup = '';

  // ── CALI 查詢提示框（顯示身分證+車牌讓業務員複製）──
  function showCaliHint(idNo, plate, name) {
    var plateF = formatPlate(plate);
    var overlay = document.createElement('div');
    overlay.id = 'caliHintOverlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:8000;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;overflow-y:auto;';
    overlay.innerHTML =
      '<div style="background:var(--surface);border-radius:16px;padding:24px;max-width:380px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,0.2);">' +
        '<div style="font-size:18px;font-weight:bold;color:#00796B;margin-bottom:16px;text-align:center;">📋 CALI 強制險查詢</div>' +

        // 客戶資訊
        '<div style="background:#E0F2F1;border-radius:8px;padding:10px 12px;margin-bottom:10px;">' +
          '<div style="font-size:12px;color:var(--text2);margin-bottom:2px;">客戶：' + name + '　車牌：' + plateF + '</div>' +
        '</div>' +

        // 複製區
        '<div style="background:#E8F5E9;border-radius:8px;padding:12px;margin-bottom:6px;">' +
          '<div style="font-size:12px;color:var(--text2);margin-bottom:4px;">① 複製身分證字號</div>' +
          '<div style="display:flex;align-items:center;gap:8px;">' +
            '<div style="font-size:17px;font-weight:bold;color:#1565C0;flex:1;letter-spacing:1px;">' + idNo + '</div>' +
            '<button onclick="copyText(\'' + idNo + '\',this)" style="background:var(--primary);color:white;border:none;padding:5px 12px;border-radius:6px;font-size:12px;cursor:pointer;">複製</button>' +
          '</div>' +
        '</div>' +
        '<div style="background:#E8F5E9;border-radius:8px;padding:12px;margin-bottom:12px;">' +
          '<div style="font-size:12px;color:var(--text2);margin-bottom:4px;">② 複製車牌號碼</div>' +
          '<div style="display:flex;align-items:center;gap:8px;">' +
            '<div style="font-size:17px;font-weight:bold;color:#1565C0;flex:1;letter-spacing:2px;">' + plateF + '</div>' +
            '<button onclick="copyText(\'' + plateF + '\',this)" style="background:var(--primary);color:white;border:none;padding:5px 12px;border-radius:6px;font-size:12px;cursor:pointer;">複製</button>' +
          '</div>' +
        '</div>' +

        // 記錄強制險區塊
        '<div style="border:1px dashed #00796B;border-radius:8px;padding:12px;margin-bottom:12px;background:#F9FBE7;">' +
          '<div style="font-size:13px;font-weight:bold;color:#00796B;margin-bottom:10px;">📝 記錄強制險資訊（查詢後填入）</div>' +
          '<div style="display:flex;flex-direction:column;gap:8px;">' +
            '<div>' +
              '<div style="font-size:11px;color:var(--text2);margin-bottom:3px;">承保公司</div>' +
              '<input id="caliCompany" type="text" placeholder="例：富邦、新光、旺旺友聯..." ' +
                'style="width:100%;box-sizing:border-box;padding:8px;border:1px solid #ccc;border-radius:6px;font-size:14px;">' +
            '</div>' +
            '<div>' +
              '<div style="font-size:11px;color:var(--text2);margin-bottom:3px;">強制險到期日</div>' +
              '<input id="caliExpiry" type="date" ' +
                'style="width:100%;box-sizing:border-box;padding:8px;border:1px solid #ccc;border-radius:6px;font-size:14px;">' +
            '</div>' +
            '<button onclick="saveExternalCompulsory(\'' + idNo + '\',\'' + plate + '\',\'' + name + '\')" ' +
              'style="width:100%;padding:10px;background:#00796B;color:white;border:none;border-radius:8px;font-size:14px;font-weight:bold;cursor:pointer;">' +
              '✅ 記錄他家強制險（此車從缺口消失）</button>' +
          '</div>' +
        '</div>' +

        // 按鈕列
        '<div style="display:flex;gap:8px;">' +
          '<button onclick="window.open(\'https://ecard.cali.org.tw/PPCP_QRY/\',\'_blank\')" ' +
            'style="flex:2;background:#00796B;color:white;border:none;padding:11px;border-radius:8px;font-size:14px;font-weight:bold;cursor:pointer;">前往 CALI 查詢 →</button>' +
          '<button onclick="document.body.removeChild(document.getElementById(\'caliHintOverlay\'))" ' +
            'style="flex:1;background:#f5f5f5;color:var(--text2);border:none;padding:11px;border-radius:8px;font-size:14px;cursor:pointer;">關閉</button>' +
        '</div>' +
        '<div style="font-size:11px;color:var(--text3);text-align:center;margin-top:8px;">複製後前往 CALI 貼上，填驗證碼後查詢結果，再回填上方記錄</div>' +
      '</div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) document.body.removeChild(overlay);
    });
  }

  // ── 儲存他家強制險記錄 ──
  function saveExternalCompulsory(idNo, plate, name) {
    var company = document.getElementById('caliCompany').value.trim();
    var expiry  = document.getElementById('caliExpiry').value;
    if (!expiry) { alert('請填入強制險到期日'); return; }

    // 轉換日期格式 yyyy-MM-dd → yyyy/MM/dd（民國年）
    var expiryDisplay = expiry.replace(/-/g, '/');
    // 轉民國年
    var parts = expiry.split('-');
    if (parts.length === 3) {
      var roc = parseInt(parts[0]) - 1911;
      expiryDisplay = roc + '/' + parts[1] + '/' + parts[2];
    }

    var saveBtn = event.target;
    saveBtn.textContent = '儲存中...'; saveBtn.disabled = true;

    var params = {
      plate:       plate,
      insuredId:   idNo,
      insuredName: name,
      company:     company || '不明',
      expiry:      expiryDisplay
    };

    var doneFn = function(result) {
      if (result && result.success) {
        saveBtn.textContent = '✅ 已記錄！';
        saveBtn.style.background = '#2E7D32';
        setTimeout(function() {
          // 關閉提示框，重新載入缺口清單
          var ov = document.getElementById('caliHintOverlay');
          if (ov) document.body.removeChild(ov);
          // 重新查詢讓這台車消失
          loadMissingCompulsory();
        }, 1200);
      } else {
        saveBtn.textContent = '❌ 儲存失敗，請重試';
        saveBtn.disabled = false;
        saveBtn.style.background = '#C62828';
        console.error('saveExternalCompulsory error:', result);
      }
    };
    var failFn = function() {
      saveBtn.textContent = '❌ 連線失敗';
      saveBtn.disabled = false;
    };

    // 直連模式用 directGasCall；一般登入模式用 gasCall（Libcode 中繼）
    if (_directShellUrl) {
      directGasCall('recordExternalCompulsory', params, doneFn, failFn);
    } else {
      gasCall('recordExternalCompulsory', params, doneFn, failFn);
    }
  }

  
  // ── 複製文字到剪貼簿 ──
  function copyText(text, btn) {
    navigator.clipboard.writeText(text).then(function() {
      var orig = btn.textContent;
      btn.textContent = '已複製 ✓';
      btn.style.background = '#2E7D32';
      setTimeout(function() { btn.textContent = orig; btn.style.background = '#1565C0'; }, 1500);
    }).catch(function() {
      // 降級方案
      var el = document.createElement('textarea');
      el.value = text; el.style.position = 'fixed'; el.style.opacity = '0';
      document.body.appendChild(el); el.select();
      document.execCommand('copy'); document.body.removeChild(el);
      var orig = btn.textContent; btn.textContent = '已複製 ✓'; btn.style.background = '#2E7D32';
      setTimeout(function() { btn.textContent = orig; btn.style.background = '#1565C0'; }, 1500);
    });
  }

  // ── 傳提醒（帶稱呼 withNickname）──
  function shareVehicleReminder(insuredId, name, insType, expiry, plate) {
    // 設定身分證以便儲存稱呼
    _nicknameInsuredId = insuredId;

    withNickname(insuredId, name, function(salutation) {
      var isMissingCompulsory = (insType.includes('任意險'));

      var msg = '';
      if (isMissingCompulsory) {
        // ── P1 缺口：催投保強制險話術 ──
        var isCar  = insType.includes('汽車');
        var isMoto = insType.includes('機車');
        var vType  = isCar ? '汽車' : isMoto ? '機車' : '車輛';
        var finePerson = isCar
          ? '汽車：罰鍰 3,000 至 15,000 元，並扣留車牌'
          : '機車：罰鍰 1,500 至 3,000 元';

        msg += '🚨【強制險投保提醒】\n\n';
        msg += salutation + ' 您好！\n\n';
        msg += '我們注意到您的' + vType + '【' + plate + '】\n';
        msg += '目前系統中未查到有效的強制汽車責任險記錄。\n\n';
        msg += '⚠️ 監理站定，未投保強制險上路將面臨：\n';
        msg += '　• ' + finePerson + '\n';
        msg += '　• 若發生事故，傷亡賠償須自行負擔\n\n';
        msg += '💡 強制責任險保障重點：\n';
        msg += '　• 傷害醫療費用：每人最高 20 萬元\n';
        msg += '　• 115/7起失能給付：每人最高 300 萬元\n';
        msg += '　• 115/7起死亡給付：每人最高 300 萬元\n\n';
        msg += '📋 您的任意險到期日：' + expiry + '\n';
        msg += '建議同時投保強制險，保障更完整！\n\n';
        msg += '如需協助投保，歡迎隨時聯繫 ' + ADVISOR_NAME + '！🙌';
      } else if (insType.includes('強制險')) {
        // ── P2：有強制險無任意險 → 補強提案話術 ──
        var isCar2  = insType.includes('汽車');
        var vType2  = isCar2 ? '汽車' : '機車';
        msg += '💡【保障補強建議】\n\n';
        msg += salutation + ' 您好！\n\n';
        msg += '您的' + vType2 + '【' + plate + '】目前已投保強制責任險，\n';
        msg += '保障基礎已打好！💪\n\n';
        msg += '⚠️ 強制險無法賠付的保障缺口：\n';
        msg += '　• 財產損失（撞壞他人車輛、財物）\n';
        if (isCar2) {
          msg += '　• 本車乘客及駕駛人傷亡\n';
        } else {
          msg += '　• 騎乘者及後座乘客傷亡\n';
        }
        msg += '　• 超額賠償責任（賠償超過強制險上限部分）\n\n';
        msg += '🛡️ 建議加保任意第三人責任險：\n';
        msg += '　✅ 第三人財產損失保障\n';
        msg += '　✅ 駕駛人/乘客傷亡保障\n';
        msg += '　✅ 超額責任補足強制險不足\n';
        msg += '　✅ 保費實惠，保障更完整！\n\n';
        msg += '強制險到期日：' + expiry + '\n';
        msg += '如需了解詳情，隨時聯繫我們 ' + ADVISOR_NAME + '！🙌';
      } else {
        // ── 一般提醒話術 ──
        msg += salutation + ' 您好！\n\n';
        msg += '您的車輛【' + plate + '】' + insType + '\n';
        msg += '將於 ' + expiry + ' 到期，請記得安排續保。\n\n';
        msg += '如有任何問題，歡迎隨時聯繫我們 ' + ADVISOR_NAME + '！';
      }

      if (ADVISOR_LINE) msg += '\n📲 LINE：https://line.me/ti/p/' + ADVISOR_LINE;
      shareViaLine(msg);
    });
  }

    // ══════════════════════════════════════════════════════
  // ★ 提案追蹤（有強制無任意商機）
  // ══════════════════════════════════════════════════════

  // 追蹤狀態樣式
  function _trackStatusStyle(status) {
    var styles = {
      '待追蹤':   { bg: '#F5F5F5', clr: '#757575', icon: '⏳' },
      '已通知':   { bg: '#E3F2FD', clr: '#1565C0', icon: '📨' },
      '報價中':   { bg: '#FFF8E1', clr: '#F57F17', icon: '💰' },
      '加保成功': { bg: '#E8F5E9', clr: '#2E7D32', icon: '✅' },
      '不加保':   { bg: '#FFEBEE', clr: '#C62828', icon: '❌' },
      '考慮中':   { bg: '#EDE7F6', clr: '#6A1B9A', icon: '🤔' },
    };
    return styles[status] || { bg: '#E8EAF6', clr: '#3949AB', icon: '📌' };
  }

  // 追蹤記錄面板
  function openProposalTrack(plate, name, insuredId, insType, expiry, currentStatus, currentNote) {
    var overlayId = 'proposalOverlay';
    var existing  = document.getElementById(overlayId);
    if (existing) document.body.removeChild(existing);

    var overlay = document.createElement('div');
    overlay.id  = overlayId;
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:8500;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;';

    var STATUSES = ['待追蹤','已通知','報價中','加保成功','不加保','考慮中'];
    var statusBtns = STATUSES.map(function(s) {
      var st  = _trackStatusStyle(s);
      var isActive = (s === currentStatus);
      return '<button onclick="selectProposalStatus(this,\'' + s + '\')" data-status="' + s + '" ' +
        'style="flex:1;padding:7px 4px;border-radius:8px;font-size:12px;font-weight:bold;cursor:pointer;' +
        'background:' + (isActive ? st.bg : '#F5F5F5') + ';color:' + (isActive ? st.clr : '#888') + ';' +
        'border:' + (isActive ? '2px solid '+st.clr : '1px solid #DDD') + ';">' +
        st.icon + ' ' + s + '</button>';
    }).join('');

    overlay.innerHTML =
      '<div style="background:var(--surface);border-radius:16px;padding:24px;max-width:400px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,0.2);">' +
        '<div style="font-size:17px;font-weight:bold;color:#6A1B9A;margin-bottom:4px;">📋 提案追蹤記錄</div>' +
        '<div style="font-size:13px;color:var(--text3);margin-bottom:16px;">' + name + '　🚗 ' + plate + '</div>' +

        // 狀態選擇
        '<div style="font-size:12px;color:var(--text2);font-weight:bold;margin-bottom:8px;">追蹤狀態</div>' +
        '<div id="proposalStatusBtns" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;">' +
          statusBtns +
        '</div>' +

        // 備註
        '<div style="font-size:12px;color:var(--text2);font-weight:bold;margin-bottom:6px;">備註</div>' +
        '<textarea id="proposalNote" rows="3" placeholder="例：已傳訊息、等待回覆；報價 NT$1,500；已拒絕..." ' +
          'style="width:100%;box-sizing:border-box;padding:10px;border:1px solid #DDD;border-radius:8px;font-size:14px;resize:vertical;margin-bottom:14px;">' + (currentNote||'') + '</textarea>' +

        // 按鈕
        '<div style="display:flex;gap:8px;">' +
          '<button id="proposalSaveBtn" onclick="saveProposalTrack(\'' + plate.replace(/'/g,"'") + '\',\'' + name.replace(/'/g,"'") + '\',\'' + insuredId.replace(/'/g,"'") + '\',\'' + insType.replace(/'/g,"'") + '\',\'' + expiry.replace(/'/g,"'") + '\')" ' +
            'style="flex:2;padding:11px;background:#6A1B9A;color:white;border:none;border-radius:8px;font-size:14px;font-weight:bold;cursor:pointer;">💾 儲存記錄</button>' +
          '<button onclick="document.body.removeChild(document.getElementById(\'proposalOverlay\'))" ' +
            'style="flex:1;padding:11px;background:#f5f5f5;color:var(--text2);border:none;border-radius:8px;font-size:14px;cursor:pointer;">關閉</button>' +
        '</div>' +
      '</div>';

    // 儲存目前選取狀態
    overlay._selectedStatus = currentStatus || '待追蹤';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) document.body.removeChild(overlay);
    });
  }

  function selectProposalStatus(btn, status) {
    var overlay = document.getElementById('proposalOverlay');
    if (overlay) overlay._selectedStatus = status;
    var btns = document.querySelectorAll('#proposalStatusBtns button');
    btns.forEach(function(b) {
      var s  = b.getAttribute('data-status');
      var st = _trackStatusStyle(s);
      var isActive = (s === status);
      b.style.background = isActive ? st.bg : '#F5F5F5';
      b.style.color       = isActive ? st.clr : '#888';
      b.style.border      = isActive ? '2px solid '+st.clr : '1px solid #DDD';
    });
  }

  function saveProposalTrack(plate, name, insuredId, insType, expiry) {
    var overlay = document.getElementById('proposalOverlay');
    var status  = overlay ? (overlay._selectedStatus || '待追蹤') : '待追蹤';
    var note    = document.getElementById('proposalNote') ? document.getElementById('proposalNote').value.trim() : '';
    var saveBtn = document.getElementById('proposalSaveBtn');
    if (saveBtn) { saveBtn.textContent = '儲存中...'; saveBtn.disabled = true; }

    var params = { plate: plate, name: name, insuredId: insuredId, insType: insType, expiry: expiry, status: status, note: note };
    var doneFn = function(result) {
      if (result && result.success) {
        var ov = document.getElementById('proposalOverlay');
        if (ov) document.body.removeChild(ov);
        loadMissingVoluntary(); // 重新載入以更新狀態
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
      directGasCall('saveProposalRecord', params, doneFn, failFn);
    } else {
      gasCall('saveProposalRecord', params, doneFn, failFn);
    }
  }

    // ══════════════════════════════════════════════════════
  // ★ CALI 快速查詢
  // ══════════════════════════════════════════════════════
  var _caliPanelOpen = false;
  var _caliSearchTimer = null;

  var _EXTERNAL_TOOLS = {
    cali:       { url: 'https://ecard.cali.org.tw/PPCP_QRY/',                                      label: 'CALI 強制險查詢',   hint: '在網站輸入身分證字號及車牌號碼' },
    '2stroke':  { url: 'https://mobile.moenv.gov.tw/Motor/query/Query_Check.aspx',                  label: '機車定檢查詢', hint: '輸入車牌號碼查詢機車定期排氣檢驗記錄' },
    inspection: { url: 'https://www.mvdis.gov.tw/m3-emv-car/car/checkQuery#anchor&gsc.tab=0',      label: '車輛定檢日查詢',    hint: '個人：輸入身分證+出生年月日　法人：輸入統編+車牌' }
  };

  // ★ iOS Safari 開外部連結：嘗試 window.open，失敗則顯示提示讓用戶手動點擊
  function openExternalTool(type) {
    var tool = _EXTERNAL_TOOLS[type];
    if (!tool) return;
    _openExternalUrl(tool.url, tool.label);
  }

  function _openExternalUrl(url, label) {
    // 先嘗試 window.open（電腦/Android 有效）
    var newWin = window.open(url, '_blank');
    if (newWin) { newWin.opener = null; return; }

    // iOS Safari 封鎖了 window.open → 顯示浮動連結讓用戶直接點
    var ovId = 'extUrlHint';
    var ex = document.getElementById(ovId); if (ex) document.body.removeChild(ex);
    var bar = document.createElement('div');
    bar.id = ovId;
    bar.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:9300;' +
      'background:#1565C0;border-radius:var(--radius-md);padding:14px 20px;box-shadow:0 4px 20px rgba(0,0,0,0.3);' +
      'display:flex;flex-direction:column;align-items:center;gap:10px;min-width:260px;max-width:320px;';

    var lbl = document.createElement('div');
    lbl.style.cssText = 'color:white;font-size:12px;font-weight:700;';
    lbl.textContent = '👇 點擊前往' + (label || '');
    bar.appendChild(lbl);

    // ★ 真正的 <a>，讓用戶直接點擊（iOS 識別為用戶手勢）
    var link = document.createElement('a');
    link.href   = url;
    link.target = '_blank';
    link.rel    = 'noopener noreferrer';
    link.style.cssText = 'display:block;background:var(--surface);color:#1565C0;border-radius:8px;' +
      'padding:10px 20px;font-size:14px;font-weight:900;text-decoration:none;text-align:center;width:100%;box-sizing:border-box;';
    link.textContent = '🚀 開新分頁前往查詢';
    link.addEventListener('click', function() {
      setTimeout(function(){ var o=document.getElementById(ovId); if(o) document.body.removeChild(o); }, 300);
    });
    bar.appendChild(link);

    var closeBtn = document.createElement('button');
    closeBtn.style.cssText = 'background:transparent;border:1px solid rgba(255,255,255,0.5);color:white;border-radius:6px;padding:4px 14px;font-size:12px;cursor:pointer;';
    closeBtn.textContent = '關閉';
    closeBtn.onclick = function(){ document.body.removeChild(bar); };
    bar.appendChild(closeBtn);

    document.body.appendChild(bar);
    // 5秒後自動消失
    setTimeout(function(){ var o=document.getElementById(ovId); if(o) document.body.removeChild(o); }, 5000);
  }

  // ★ iOS Safari：用 <a target="_blank"> 保證新開分頁
  function _showExternalLinkModal(url, label, hint) {
    var ovId = 'extLinkOverlay';
    var ex = document.getElementById(ovId); if (ex) document.body.removeChild(ex);
    var ov = document.createElement('div');
    ov.id  = ovId;
    ov.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.55);z-index:9200;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;';

    // 用 innerHTML 的 <a> 標籤讓使用者直接點擊，iOS Safari 才能新開分頁
    // ★ 用 DOM API 建構 <a> 確保 iOS Safari 識別為可點擊連結
    var box = document.createElement('div');
    box.style.cssText = 'background:var(--surface);border-radius:16px;padding:24px;max-width:360px;width:100%;box-shadow:0 8px 30px rgba(0,0,0,0.25);';

    var titleEl = document.createElement('div');
    titleEl.style.cssText = 'font-size:17px;font-weight:700;color:var(--text1);margin-bottom:4px;';
    titleEl.textContent = '🔗 ' + label;
    box.appendChild(titleEl);

    var hintEl = document.createElement('div');
    hintEl.style.cssText = 'font-size:12px;color:var(--text3);margin-bottom:16px;line-height:1.6;';
    hintEl.textContent = hint;
    box.appendChild(hintEl);

    // ★ 真實的 <a> 元素，iOS Safari 一定識別為新分頁
    var link = document.createElement('a');
    link.href   = url;
    link.target = '_blank';
    link.rel    = 'noopener noreferrer';
    link.style.cssText = 'display:block;text-align:center;padding:14px;background:linear-gradient(135deg,#1565C0,#0D47A1);color:white;border-radius:var(--radius-md);font-size:15px;font-weight:700;text-decoration:none;margin-bottom:10px;';
    link.textContent = '🚀 前往查詢（開新分頁）';
    link.addEventListener('click', function() {
      var o = document.getElementById('extLinkOverlay');
      if (o) document.body.removeChild(o);
    });
    box.appendChild(link);

    var closeBtn = document.createElement('button');
    closeBtn.style.cssText = 'width:100%;padding:11px;background:#F5F5F5;color:var(--text2);border:none;border-radius:var(--radius-md);font-size:14px;cursor:pointer;';
    closeBtn.textContent = '關閉';
    closeBtn.onclick = function() { document.body.removeChild(ov); };
    box.appendChild(closeBtn);

    ov.appendChild(box);
    document.body.appendChild(ov);
    ov.addEventListener('click', function(e){ if(e.target===ov) document.body.removeChild(ov); });
  }

  // 目前展開的工具面板
  var _openToolPanel = null;

  var _TOOL_PANELS = {
    cali:       { panel: 'caliQuickPanel',       btn: 'btnCali',       input: 'caliSearchInput' },
    '2stroke':  { panel: 'strokePanel',          btn: 'btn2stroke',    input: 'strokeSearchInput' },
    inspection: { panel: 'inspectionPanel',      btn: 'btnInspection', input: 'inspectionSearchInput' },
    search:     { panel: 'searchPanel',          btn: 'btnSearch',     input: 'smartSearch' }
  };

  function toggleToolPanel(type) {
    Object.keys(_TOOL_PANELS).forEach(function(key) {
      var cfg   = _TOOL_PANELS[key];
      var panel = document.getElementById(cfg.panel);
      var btn   = document.getElementById(cfg.btn);
      if (key === type) {
        var isOpen = panel && panel.style.display !== 'none';
        if (panel) panel.style.display = isOpen ? 'none' : 'block';
        if (btn) { btn.style.opacity = isOpen ? '1' : '0.85'; btn.style.outline = isOpen ? 'none' : '2px solid rgba(255,255,255,0.6)'; }
        if (!isOpen) setTimeout(function() {
          var inp = document.getElementById(cfg.input);
          if (inp) inp.focus();
        }, 100);
      } else {
        if (panel) panel.style.display = 'none';
        if (btn) { btn.style.opacity = '1'; btn.style.outline = 'none'; }
      }
    });
  }

  function toggleCaliQuick() { toggleToolPanel('cali'); }

  function clearCaliSearch() {
    var inp = document.getElementById('caliSearchInput');
    if (inp) inp.value = '';
    var res = document.getElementById('caliSearchResults');
    if (res) res.innerHTML = '';
  }

  function caliQuickSearch(val) {
    clearTimeout(_caliSearchTimer);
    if (!val || val.trim().length < 2) {
      document.getElementById('caliSearchResults').innerHTML = '';
      return;
    }
    _caliSearchTimer = setTimeout(function() {
      _doCaliSearch(val.trim());
    }, 400);
  }

  // 二行程 / 定檢日 共用搜尋
  var _toolSearchTimers = {};
  function toolQuickSearch(val, toolType) {
    clearTimeout(_toolSearchTimers[toolType]);
    var resId = toolType === 'stroke' ? 'strokeSearchResults' : 'inspectionSearchResults';
    if (!val || val.trim().length < 2) {
      document.getElementById(resId).innerHTML = '';
      return;
    }
    _toolSearchTimers[toolType] = setTimeout(function() {
      _doToolSearch(val.trim(), toolType, resId);
    }, 400);
  }

  function _doToolSearch(q, toolType, resId) {
    var res = document.getElementById(resId);
    res.innerHTML = '<div style="text-align:center;color:#AAA;padding:10px;font-size:13px;">搜尋中...</div>';
    var fn = function(results) {
      if (!results || results.length === 0) {
        res.innerHTML = '<div style="text-align:center;color:#AAA;padding:10px;font-size:13px;">查無結果</div>';
        return;
      }
      // 二行程：只顯示有車牌的機車
      // 定檢日：顯示有車牌的汽車（含法人）
      var filtered = results.filter(function(r) {
        return r.plateNo && r.plateNo !== '無';
      });
      if (filtered.length === 0) {
        res.innerHTML = '<div style="text-align:center;color:#AAA;padding:10px;font-size:13px;">查無車輛資料</div>';
        return;
      }
      var html = '';
      filtered.slice(0, 10).forEach(function(item) {
        var idNo    = (item.maskedId || '').replace(/"/g, '');
        var plate   = (item.plateNo  || '').replace(/"/g, '');
        var name    = (item.name || item.applicantName || '').replace(/"/g, '');
        var bday    = (item.birthday || '').replace(/"/g, '');
        // 判斷個人 vs 法人：身分證10碼英數 vs 統編8碼純數字
        var isCompany = idNo && /^\d{8}$/.test(idNo.replace(/[-\s]/g, ''));

        html += '<div style="border:1px solid #E0E0E0;border-radius:8px;padding:10px 12px;margin-bottom:8px;background:#FAFAFA;">';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">';
        html += '<div style="font-size:14px;font-weight:700;color:var(--text1);">' + name + '</div>';
        html += '<div style="font-size:11px;color:var(--text2);">' + item.type + '</div>';
        html += '</div>';

        if (toolType === 'stroke') {
          // 二行程：只需要車牌
          html += '<div style="display:flex;gap:6px;">';
          html += '<button onclick="toolCopyItem(\''+ plate +'\',\'plate\')" ' +
            'style="flex:1;padding:8px 6px;background:#E3F2FD;color:#1565C0;border:1px solid #90CAF9;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;">' +
            '🚗 複製車牌<br><span style="font-size:11px;font-weight:400;">' + plate + '</span></button>';
          html += '<a href="https://mobile.moenv.gov.tw/Motor/query/Query_Check.aspx" target="_blank" rel="noopener noreferrer" ' +
            'style="flex:1;display:block;padding:8px 6px;background:var(--primary);color:white;border-radius:6px;font-size:12px;font-weight:700;text-decoration:none;text-align:center;">' +
            '🏍️ 前往<br><span style="font-size:11px;font-weight:400;opacity:0.9">機車定檢查詢</span></a>';
          html += '</div>';
        } else {
          // 定檢日
          html += '<div style="font-size:11px;color:var(--text3);margin-bottom:6px;">' + (isCompany ? '🏢 法人　統編：' + idNo : '👤 個人　身分證：' + idNo + (bday ? '　生日：' + bday : '')) + '</div>';
          html += '<div style="display:flex;gap:5px;flex-wrap:wrap;">';
          if (isCompany) {
            // 法人：複製統編 + 複製車牌 + 前往
            html += '<button onclick="toolCopyItem(\''+ idNo +'\',\'id'+ '\')" style="flex:1;min-width:80px;padding:7px 4px;background:#F3E5F5;color:#6A1B9A;border:1px solid #CE93D8;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;">🆔 複製統編<br><span style="font-size:10px;font-weight:400;">' + idNo + '</span></button>';
            html += '<button onclick="toolCopyItem(\''+ plate +'\',\'plate\')" style="flex:1;min-width:80px;padding:7px 4px;background:#E8F5E9;color:#1B5E20;border:1px solid #A5D6A7;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;">🚗 複製車牌<br><span style="font-size:10px;font-weight:400;">' + plate + '</span></button>';
          } else {
            // 個人：複製身分證 + 複製生日 + 前往
            html += '<button onclick="toolCopyItem(\''+ idNo +'\',\'id'+ '\')" style="flex:1;min-width:80px;padding:7px 4px;background:#E3F2FD;color:#1565C0;border:1px solid #90CAF9;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;">🆔 複製身分證<br><span style="font-size:10px;font-weight:400;">' + idNo + '</span></button>';
            if (bday) html += '<button onclick="toolCopyItem(\''+ bday +'\',\'bday\')" style="flex:1;min-width:80px;padding:7px 4px;background:#FFF3E0;color:#DC2626;border:1px solid #FFCC80;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;">🎂 複製生日<br><span style="font-size:10px;font-weight:400;">' + bday + '</span></button>';
          }
          html += '<a href="https://www.mvdis.gov.tw/m3-emv-car/car/checkQuery#anchor&gsc.tab=0" target="_blank" rel="noopener noreferrer" ' +
            'style="flex:1;min-width:80px;display:block;padding:7px 4px;background:#6A1B9A;color:white;border-radius:6px;font-size:11px;font-weight:700;text-decoration:none;text-align:center;">' +
            '🗓️ 前往定檢查詢</a>';
          html += '</div>';
        }
        html += '</div>';
      });
      if (filtered.length > 10) html += '<div style="text-align:center;color:#AAA;font-size:11px;padding:4px;">顯示前 10 筆</div>';
      res.innerHTML = html;
    };
    var failFn = function() { res.innerHTML = '<div style="text-align:center;color:#d32f2f;padding:10px;font-size:13px;">搜尋失敗</div>'; };
    if (_directShellUrl) directGasCall('searchPolicies', { q: q, showAll: false }, fn, failFn);
    else gasCall('searchPolicies', { q: q, showAll: false }, fn, failFn);
  }

  function toolCopyItem(text, type) {
    if (!text) return;
    if (navigator.clipboard) navigator.clipboard.writeText(text);
    try { var t=document.createElement('textarea');t.value=text;document.body.appendChild(t);t.select();document.execCommand('copy');document.body.removeChild(t); } catch(e){}
    var labels = { plate:'車牌', id:'身分證/統編', bday:'生日' };
    showBdToast('📋 已複製' + (labels[type]||'資料') + '：' + text);
  }

  // 複製車牌後立即顯示外部連結提示
  function toolCopyAndGo(plate, toolType) {
    toolCopyItem(plate, 'plate');
    setTimeout(function() { openExternalTool(toolType); }, 300);
  }

  function _doCaliSearch(q) {
    var res = document.getElementById('caliSearchResults');
    res.innerHTML = '<div style="text-align:center;color:#AAA;padding:10px;font-size:13px;">搜尋中...</div>';
    var fn = function(results) {
      if (!results || results.length === 0) {
        res.innerHTML = '<div style="text-align:center;color:#AAA;padding:10px;font-size:13px;">查無結果</div>';
        return;
      }
      // 只顯示有車牌的保單（CALI 查詢用）
      var filtered = results.filter(function(r){ return r.plateNo && r.plateNo !== '無'; });
      if (filtered.length === 0) {
        res.innerHTML = '<div style="text-align:center;color:#AAA;padding:10px;font-size:13px;">查無車險資料</div>';
        return;
      }
      var html = '';
      filtered.slice(0, 10).forEach(function(item) {
        var safeId    = (item.maskedId||'').replace(/"/g,'');
        var safePlate = (item.plateNo||'').replace(/"/g,'');
        var safeName  = (item.name||item.applicantName||'').replace(/"/g,'');
        html +=
          '<div style="border:1px solid #E0E0E0;border-radius:8px;padding:10px 12px;margin-bottom:8px;background:#FAFAFA;">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">' +
              '<div style="font-size:14px;font-weight:700;color:var(--text1);">' + (item.name||item.applicantName||'—') + '</div>' +
              '<div style="font-size:12px;color:var(--text2);">' + item.type + '</div>' +
            '</div>' +
            '<div style="display:flex;gap:6px;flex-wrap:wrap;">' +
              (safeId ?
                '<button onclick="caliCopyAndGo(\''+safeId+'\',\'id\')" ' +
                  'style="flex:1;padding:8px 6px;background:#E3F2FD;color:#1565C0;border:1px solid #90CAF9;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;">' +
                  '🆔 複製身分證<br><span style="font-size:11px;font-weight:400">'+safeId+'</span></button>'
              : '') +
              (safePlate ?
                '<button onclick="caliCopyAndGo(\''+safePlate+'\',\'plate\')" ' +
                  'style="flex:1;padding:8px 6px;background:#E8F5E9;color:#1B5E20;border:1px solid #A5D6A7;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;">' +
                  '🚗 複製車牌<br><span style="font-size:11px;font-weight:400">'+safePlate+'</span></button>'
              : '') +
              '<a href="https://ecard.cali.org.tw/PPCP_QRY/" target="_blank" rel="noopener noreferrer" ' +
                'style="flex:1;display:block;padding:8px 6px;background:#00796B;color:white;border-radius:6px;font-size:12px;font-weight:700;text-decoration:none;text-align:center;">' +
                '🔗 前往 CALI</a>' +
            '</div>' +
          '</div>';
      });
      if (filtered.length > 10) {
        html += '<div style="text-align:center;color:#AAA;font-size:11px;padding:4px;">顯示前 10 筆，請縮小搜尋範圍</div>';
      }
      res.innerHTML = html;
    };
    var failFn = function() {
      res.innerHTML = '<div style="text-align:center;color:#d32f2f;padding:10px;font-size:13px;">搜尋失敗，請稍後再試</div>';
    };
    var params = { q: q, showAll: false };
    if (_directShellUrl) directGasCall('searchPolicies', params, fn, failFn);
    else gasCall('searchPolicies', params, fn, failFn);
  }

  function caliCopyAndGo(text, type) {
    if (navigator.clipboard) navigator.clipboard.writeText(text);
    try {
      var t = document.createElement('textarea');
      t.value = text; document.body.appendChild(t); t.select();
      document.execCommand('copy'); document.body.removeChild(t);
    } catch(e) {}
    var label = type === 'id' ? '身分證' : '車牌';
    showBdToast('📋 已複製' + label + '：' + text + '　請前往 CALI 貼上');
  }

  function openCaliDirect(idNo, plate) {
    // 複製身分證，直接跳轉 CALI
    if (idNo && idNo !== '無') {
      if (navigator.clipboard) navigator.clipboard.writeText(idNo);
      try { var t=document.createElement('textarea');t.value=idNo;document.body.appendChild(t);t.select();document.execCommand('copy');document.body.removeChild(t); } catch(e){}
      showBdToast('📋 身分證已複製，前往 CALI 後直接貼上！');
    }
    _openExternalUrl('https://ecard.cali.org.tw/PPCP_QRY/', 'CALI 強制險查詢');
  }


// ══════════════════════════════════════════════════════
// ★ 把 index.html 內 onclick="..." 會呼叫到的函式，以及被
//   尚未拆分的 expiry-fire 區塊直接呼叫的函式，expose 到全域
// ══════════════════════════════════════════════════════
window.openDetailFromGap       = openDetailFromGap;
window.showCaliHint            = showCaliHint;
window.saveExternalCompulsory  = saveExternalCompulsory;
window.copyText                = copyText;
window.shareVehicleReminder    = shareVehicleReminder;
window.selectProposalStatus    = selectProposalStatus;
window.saveProposalTrack       = saveProposalTrack;
window.toggleToolPanel         = toggleToolPanel;
window.caliQuickSearch         = caliQuickSearch;
window.toolQuickSearch         = toolQuickSearch;
window.toolCopyItem            = toolCopyItem;
window.caliCopyAndGo           = caliCopyAndGo;
window.renderVehicleGapList    = renderVehicleGapList;
window._trackStatusStyle       = _trackStatusStyle;
