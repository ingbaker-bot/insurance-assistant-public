// ══════════════════════════════════════════════════════
// modal.js — 各種 Modal 彈窗（產險/旅平卡詳情）（ES Module）
// 原本位於 index.html 第 804–1103 行，拆分示範
// 依賴（來自已拆分的 auth.js，皆為全域變數/函式，載入順序已確保先於本模組執行）：
//   gasCall, directGasCall, _directShellUrl, ADVISOR_NAME, ADVISOR_LINE,
//   currentPolicyData, currentTravelData（auth.js 已宣告為 window 屬性，此處可安全裸賦值）
// ══════════════════════════════════════════════════════


  // ── 產險 Modal ──
  function openDetail(no) {
    document.getElementById('loading').style.display = 'block';
    
    // 【雙軌優化】明細查看同樣加入雙軌路由
    if (_directShellUrl) {
      directGasCall('getPolicyDetails', { no: no }, renderModal);
    } else {
      gasCall('getPolicyDetails', { no: no }, renderModal);
    }
  }

  function renderModal(data) {
    document.getElementById('loading').style.display = 'none';
    if (!data) return;
    currentPolicyData = data;
    document.getElementById('familyReportArea').innerHTML = '';
    document.getElementById('travelStatusArea').innerHTML = '';
    var main     = data.main;
    var agentTag = main.agentCode && main.agentCode !== "無" ? " <span style='color:#FF9800;'>[" + main.agentCode + "]</span>" : "";

    // 【智慧防護】如果後端改傳 main.expiry，前端優先讀取！否則相容 main.expiryDate 舊規格
    var finalExpiry = main.expiry || main.expiryDate || "—";
    var expStr = (finalExpiry && finalExpiry !== 'undefined') ? finalExpiry : '—';

    var html = '<div class="detail-section">' +
      '<div class="detail-title" style="font-size:20px;color:#00A3C4;">' + main.insuredName + ' 的專屬保障摘要' + agentTag + '</div>' +
      '<div class="info-grid">' +
        '<div><div class="info-label">保單號碼</div><b>' + main.policyNo + '</b></div>' +
        '<div><div class="info-label">險種</div><b>' + main.type + '</b></div>' +
        '<div><div class="info-label">生效日期</div>' + (main.effectiveDate || '—') + '</div>' +
        '<div><div class="info-label">到期日期</div><b style="color:#d32f2f;">' + expStr + '</b></div>' +
        '<div><div class="info-label">總保費</div><b style="color:#00B900;">NT$ ' + (main.premium || 0) + '</b></div>' +
        '<div><div class="info-label">車牌</div>' + main.plateNo + '</div>' +
        (main.insuredPhone && main.insuredPhone !== '無' && main.insuredPhone !== '' ?
          '<div><div class="info-label">被保人電話</div>📱 ' + main.insuredPhone + '</div>' : '') +
        (main.applicantName && main.applicantName !== '無' ?
          '<div><div class="info-label">要保人</div>👤 ' + main.applicantName + '</div>' : '') +
        (main.applicantId && main.applicantId !== '無' ?
          '<div><div class="info-label">要保人身分證</div>🪪 ' + main.applicantId + '</div>' : '') +
        (main.applicantPhone && main.applicantPhone !== '無' ?
          '<div><div class="info-label">要保人電話</div>📱 ' + main.applicantPhone + '</div>' : '') +
        (main.renewStatus && String(main.renewStatus).startsWith('他家') ?
          '<div style="grid-column:1/-1;background:#FFF8E1;border:1px solid #FFD54F;border-radius:8px;padding:8px 12px;display:flex;align-items:center;gap:8px;">' +
          '<span style="color:#DC2626;font-size:14px;">⚠️ 他家承保</span>' +
          '<span style="color:var(--text1);font-weight:bold;font-size:14px;">' +
          (function(){ var p = String(main.renewStatus).split('|'); return (p[1]||'不明') + (p[2] ? '　記錄日期：'+p[2] : ''); })() +
          '</span></div>' : '') +
      '</div></div>';
      
    // ── 核心保障明細表格 ──
    html += '<div class="detail-section"><div class="detail-title">🛡️ 核心保障明細</div>' +
      '<table><tr><th>保障項目</th><th>保額</th><th style="text-align:right;">保費</th></tr>';
    if (data.details && data.details.length > 0) {
      data.details.forEach(function(i) { html += '<tr><td>' + i.name + '</td><td>' + i.amount + '</td><td style="text-align:right;">' + i.premium + '</td></tr>'; });
    } else { html += '<tr><td colspan="3" style="text-align:center;color:var(--text3);">無明細資料</td></tr>'; }
    html += '</table></div>';
    html += '<div style="text-align:center;margin-top:20px;font-size:12px;color:var(--text3);">由專屬顧問 ' + ADVISOR_NAME + ' 為您整理</div>';

    document.getElementById('modalBody').innerHTML = html;
    document.getElementById('modalBody').style.display = 'block';
    document.getElementById('imagePreviewContainer').style.display = 'none';
    document.getElementById('actionButtons').style.display = 'flex';

    // ── 旅平卡狀態：先清空，並在此處導入「真實身分證勾稽雙軌路由」 ──
    document.getElementById('travelStatusArea').innerHTML =
      '<div style="margin-top:16px;border-top:2px dashed #FFE0B2;padding-top:14px;">' +
        '<div style="font-size:13px;color:#FF9800;font-weight:bold;">🏖️ 旅平卡狀態</div>' +
        '<div style="font-size:12px;color:var(--text3);margin-top:4px;">查詢中...</div>' +
      '</div>';
      
    // 【核心修正】移入函式內部！改用真實身分證 ID (realId) 繞過中央阻斷
    var realId = main.realId || main.maskedId; 
    if (_directShellUrl) {
      directGasCall('checkTravelCoverage', { id: realId }, renderTravelStatus);
    } else {
      gasCall('checkTravelCoverage', { id: realId }, renderTravelStatus);
    }

    // ── 家庭保障區塊 ──
    if (main.familyId && main.familyId !== "無") {
      document.getElementById('familyReportArea').innerHTML =
        '<div style="margin-top:20px;border-top:3px double #eee;padding-top:16px;">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;">' +
            '<div><span style="font-weight:bold;color:var(--text1);">👨‍👩‍👧‍👦 家庭保障</span>' +
            '<span style="font-size:12px;color:var(--text3);margin-left:8px;">(' + main.familyId + ')</span></div>' +
            '<button onclick="loadFamilyReport(\'' + main.familyId + '\')" ' +
              'style="background:#00A3C4;color:white;border:none;padding:8px 16px;border-radius:6px;font-weight:bold;cursor:pointer;font-size:13px;margin-right:8px;">' +
              '展開家庭總覽 ↓</button>' +
            '<button onclick="openFamilyTableReport(\'' + main.familyId + '\')" ' +
              'style="background:var(--primary);color:white;border:none;padding:8px 16px;border-radius:6px;font-weight:bold;cursor:pointer;font-size:13px;">' +
              '📋 家庭保障報表</button>' +
          '</div>' +
        '</div>';
    }
    document.getElementById('detailModal').style.display = 'flex';
  }
  
  // ── 旅平卡狀態顯示 ──
  function renderTravelStatus(info) {
    var area = document.getElementById('travelStatusArea');
    if (!area) return;

    var html = '<div style="margin-top:16px;border-top:2px dashed #FFE0B2;padding-top:14px;">' +
      '<div style="font-size:13px;color:#FF9800;font-weight:bold;margin-bottom:8px;">🏖️ 旅平卡狀態</div>';

    if (info && info.hasTravelCard) {
      // ✅ 有旅平卡
      html +=
        '<div style="background:#E8F5E9;border-radius:8px;padding:10px 14px;border-left:4px solid #43A047;">' +
          '<div style="color:#2E7D32;font-weight:bold;font-size:14px;">✅ 已持有旅平卡</div>' +
          '<div style="font-size:13px;color:var(--text1);margin-top:6px;display:grid;grid-template-columns:1fr 1fr;gap:6px;">' +
            '<div><span style="color:var(--text3);font-size:11px;">卡片類別</span><br>' + info.cardType + '</div>' +
            '<div><span style="color:var(--text3);font-size:11px;">身份</span><br>' + info.role + '</div>' +
            '<div><span style="color:var(--text3);font-size:11px;">要保人</span><br>' + info.appName + '</div>' +
            '<div><span style="color:var(--text3);font-size:11px;">憑證號碼</span><br><span style="font-size:11px;">' + info.certNo + '</span></div>' +
          '</div>' +
        '</div>';
    } else {
      // ❌ 無旅平卡
      html +=
        '<div style="background:#FFF8E1;border-radius:8px;padding:10px 14px;border-left:4px solid #FFB300;">' +
          '<div style="color:#DC2626;font-weight:bold;font-size:14px;">❌ 尚無旅平卡保障</div>' +
          '<div style="font-size:12px;color:var(--text2);margin-top:6px;">可向客戶介紹旅平卡，提供意外及旅遊保障 🌏</div>' +
        '</div>';
    }

    html += '</div>';
    area.innerHTML = html;
  }

  function loadFamilyReport(familyId) {
    if (!familyId || familyId === "無") {
      alert("此保戶尚無家庭保障資料。");
      return;
    }
    
    document.getElementById('familyReportArea').querySelector('button').textContent = '載入中...';
    
    // 【雙軌智慧優化】確保只使用區域變數 familyId，徹底消滅 main is not defined 錯誤！
    if (_directShellUrl) {
      directGasCall('getFamilyReport', { id: familyId }, renderFamilyReport);
    } else {
      gasCall('getFamilyReport', { id: familyId }, renderFamilyReport);
    }
  }

  // ── 旅平卡 Modal ──
  function openTravelDetail(certNo) {
    document.getElementById('loading').style.display = 'block';
    var failFn = function() {
      document.getElementById('loading').style.display = 'none';
      alert('讀取旅平卡資料失敗，請稍後再試。');
    };
    if (_directShellUrl) {
      directGasCall('getTravelCardDetails', { no: certNo }, renderTravelModal, failFn);
    } else {
      gasCall('getTravelCardDetails', { no: certNo }, renderTravelModal, failFn);
    }
  }

  function renderTravelModal(data) {
    document.getElementById('loading').style.display = 'none';
    if (!data) return;
    currentTravelData = data;
    var m         = data.main;
    var agentTag  = m.agentCode ? ' <span style="color:#FF9800;font-size:16px;">[' + m.agentCode + ']</span>' : '';

    var html =
      '<div class="detail-section">' +
        '<div class="detail-title detail-title-travel" style="font-size:19px;color:' + 'var(--travel-color)' + ';">' +
          '🏖️ ' + m.appName + ' 的旅平卡明細' + agentTag +
        '</div>' +
        '<div class="info-grid">' +
          '<div><div class="info-label">憑證號碼</div><b>' + m.certNo + '</b></div>' +
          '<div><div class="info-label">卡片類別</div><b>' + m.cardType + '</b></div>' +
          '<div><div class="info-label">要保人身分證</div>' + m.appId + '</div>' +
          '<div><div class="info-label">生效起始日</div><b>' + fmtDate(m.effDate) + '</b></div>' +
          '<div><div class="info-label">行動電話</div>' + (m.mobile || '—') + '</div>' +
          '<div><div class="info-label">聯絡電話</div>' + (m.phone || '—') + '</div>' +
          '<div><div class="info-label">出生日期</div>' + fmtDate(m.birthday) + '</div>' +
          '<div><div class="info-label">Email</div>' + (m.email || '—') + '</div>' +
        '</div>' +
        '<div class="info-label" style="margin-top:8px;">🏠 通訊地址</div>' +
        '<div style="font-size:13px;color:var(--text1);margin-top:4px;">' + (m.address || '—') + '</div>' +
      '</div>';

    // 被保人名冊表格
    html += '<div class="detail-section">' +
      '<div class="detail-title detail-title-travel">👥 被保人名冊（共 ' + data.members.length + ' 人）</div>' +
      '<table class="travel-member-table">' +
      '<tr><th>姓名</th><th>關係</th><th>出生日期</th><th>身分證</th><th>受益人</th></tr>';

    data.members.forEach(function(mb) {
      html += '<tr>' +
        '<td><b>' + mb.name + '</b></td>' +
        '<td><span class="relation-badge">' + mb.relation + '</span></td>' +
        '<td>' + fmtDate(mb.birthday) + '</td>' +
        '<td style="font-size:11px;">' + mb.idNo + '</td>' +
        '<td style="font-size:11px;">' + mb.beneNamee + '</td>' +
      '</tr>';
    });
    html += '</table></div>';
    html += '<div style="text-align:center;margin-top:16px;font-size:12px;color:var(--text3);">由專屬顧問 ' + ADVISOR_NAME + ' 為您整理</div>';

    document.getElementById('travelModalBody').innerHTML = html;
    document.getElementById('travelActionButtons').style.display = 'flex';
    document.getElementById('travelModal').style.display = 'flex';
  }

  // ── 旅平卡分享 ──
  // ══════════════════════════════════════════════
  // ★ LINE 分享通用函式（雙軌模式）
  //
  //  手機：直接開啟 LINE App 分享純文字
  //  電腦：自動複製訊息到剪貼簿 + 提示說明
  //        （LINE 網頁版無法直接分享純文字，需手動開 LINE 貼上）
  // ══════════════════════════════════════════════
  function shareViaLine(msg) {
    var isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      // 手機：直接開啟 LINE App
      window.open("https://line.me/R/share?text=" + encodeURIComponent(msg), '_blank');
    } else {
      // 電腦：複製到剪貼簿，提示使用者自行開啟 LINE 貼上
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(msg).then(function() {
          alert(
            '📋 訊息已複製到剪貼簿！\n\n' +
            '請開啟 LINE，選擇聯絡人後按 Ctrl+V 貼上訊息，再點傳送。'
          );
        }).catch(function() {
          // 剪貼簿 API 失敗（HTTP 或權限問題）→ 改用舊方法
          window.open("https://line.me/R/share?text=" + encodeURIComponent(msg), '_blank');
        });
      } else {
        // 不支援剪貼簿 API → 用舊方法
        window.open("https://line.me/R/share?text=" + encodeURIComponent(msg), '_blank');
      }
    }
  }

  function shareTravelCard() {
    if (!currentTravelData) return;
    var m   = currentTravelData.main;
    var msg = "🏖️【旅平卡資訊】\n\n";
    msg += "👤 要保人：" + m.appName + "\n";
    msg += "📋 憑證號碼：" + m.certNo + "\n";
    msg += "🗓️ 生效日：" + m.effDate + "\n";
    msg += "📱 電話：" + (m.mobile || m.phone || '—') + "\n\n";
    msg += "👥 被保人名冊（" + currentTravelData.members.length + " 人）：\n";
    currentTravelData.members.forEach(function(mb) {
      msg += "  • " + mb.name + "（" + mb.relation + "）\n";
    });
    msg += "\n如需查詢或更新資料，請聯繫 " + ADVISOR_NAME + "！";
    if (ADVISOR_LINE) msg += "\n📲 加入 LINE：https://line.me/ti/p/" + ADVISOR_LINE;
    shareViaLine(msg);
  }

  function generateTravelImageCard() {
    var target = document.getElementById('travelModalBody');
    if (!target) return;
    document.getElementById('loading').style.display = 'block';
    html2canvas(target, { scale: 2, backgroundColor: "#ffffff", useCORS: true }).then(function(canvas) {
      document.getElementById('loading').style.display = 'none';
      var imgSrc  = canvas.toDataURL("image/jpeg", 0.92);
      var overlay = document.getElementById('travelImageOverlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'travelImageOverlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.75);z-index:3000;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;';
        document.body.appendChild(overlay);
      }
      overlay._imgSrc = imgSrc;
      overlay.innerHTML =
        '<div style="background:var(--surface);width:100%;max-width:600px;border-radius:20px 20px 0 0;padding:20px;max-height:85vh;overflow-y:auto;box-sizing:border-box;">' +
          '<div style="color:var(--travel-color);font-weight:bold;font-size:14px;margin-bottom:10px;text-align:center;">📸 旅平卡圖卡已生成！</div>' +
          '<img id="travelCardImg" style="width:100%;border-radius:var(--radius-md);margin-bottom:15px;" />' +
          '<div style="display:flex;gap:10px;">' +
            '<button onclick="downloadTravelImage()" style="flex:1;padding:12px;background:#FF7043;color:white;border:none;border-radius:8px;font-weight:bold;cursor:pointer;">📥 下載圖卡</button>' +
            '<button onclick="document.getElementById(\'travelImageOverlay\').style.display=\'none\'" style="flex:1;padding:12px;background:#f1f1f1;color:var(--text1);border:none;border-radius:8px;font-weight:bold;cursor:pointer;">關閉返回</button>' +
          '</div>' +
        '</div>';
      document.getElementById('travelCardImg').src = imgSrc;
      overlay.style.display = 'flex';
    });
  }

  function downloadTravelImage() {
    var overlay = document.getElementById('travelImageOverlay');
    if (!overlay || !overlay._imgSrc) return;
    var a = document.createElement('a');
    a.href = overlay._imgSrc;
    a.download = (currentTravelData ? currentTravelData.main.appName : '旅平卡') + '_旅平卡明細.jpg';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  function closeTravelModal() { document.getElementById('travelModal').style.display = 'none'; currentTravelData = null; }


// ══════════════════════════════════════════════════════
// ★ 把 index.html 內 onclick="..." 會呼叫到的函式，以及被
//   birthday.js／family.js／tabs-search.js／cali-opportunity.js／
//   expiry-fire.js／policy-render.js 當作共用工具呼叫的函式，
//   expose 到全域（renderModal／openDetail／shareViaLine 是
//   被最多其他模組依賴的入口，務必完整）
// ══════════════════════════════════════════════════════
window.loadFamilyReport        = loadFamilyReport;
window.shareTravelCard         = shareTravelCard;
window.generateTravelImageCard = generateTravelImageCard;
window.downloadTravelImage     = downloadTravelImage;
window.closeTravelModal        = closeTravelModal;
window.renderModal             = renderModal;
window.openDetail              = openDetail;
window.openTravelDetail        = openTravelDetail;
window.shareViaLine            = shareViaLine;
