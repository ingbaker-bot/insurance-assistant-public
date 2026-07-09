// ══════════════════════════════════════════════════════
// family.js — 家庭總覽、分享、圖卡（ES Module）
// 原本位於 index.html 第 2582–2999 行，拆分示範
// 依賴（來自尚未拆分的其他區塊，皆為全域變數/函式，載入順序已確保先於本模組執行）：
//   gasCall, directGasCall, _directShellUrl, ADVISOR_NAME,
//   currentPolicyData, withNickname, shareViaLine, html2canvas（CDN全域）
// ══════════════════════════════════════════════════════

  // ── 家庭總覽 ──
  function renderFamilyReport(familyData) {
    if (!familyData || !familyData.memberGroups) return;
    var area    = document.getElementById('familyReportArea');
    var s       = familyData.summary;
    var advisor = familyData.advisorName || ADVISOR_NAME;

    var summaryHtml = '<div class="family-summary-bar">';
    if (s.urgent  > 0) summaryHtml += '<span class="summary-chip chip-urgent">🔴 緊急 ' + s.urgent + ' 張</span>';
    if (s.warning > 0) summaryHtml += '<span class="summary-chip chip-warning">🟠 待跟進 ' + s.warning + ' 張</span>';
    if (s.ok      > 0) summaryHtml += '<span class="summary-chip chip-ok">✅ 正常 ' + s.ok + ' 張</span>';
    if (s.expired > 0) summaryHtml += '<span class="summary-chip chip-expired">⚫ 退保/過期 ' + s.expired + ' 張</span>';
    summaryHtml += '</div>';

    // ★【核心修正】提早在此處定義並初始化 html 變數，確保內部 policies.forEach 累加時絕對不崩潰！
    var html = ''; 
    var membersHtml = '';

    familyData.memberGroups.forEach(function(member) {
      var memberShareData = buildMemberShareText(member, advisor);
      
      // 先清空單一成員的保單列累加字串
      html = ''; 

      member.policies.forEach(function(p) {
        var daysText = p.daysLeft === null ? '—' : p.urgency === 'expired' ? '已退保' : p.daysLeft < 0 ? '已過期' : p.daysLeft + ' 天';
        
        // 【Baker 老師專屬新功能】只要保單有號碼，就在險種別後面加上一個精緻的「🔍 查明細」小按鈕！
        var detailBtnHtml = '';
        if (p.policyNo && p.policyNo !== '無') {
          detailBtnHtml = '<button onclick="event.stopPropagation();openDetail(\'' + p.policyNo + '\')" style="margin-left:6px;background:#E3F2FD;color:#1565C0;border:1px solid #BBDEFB;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:bold;cursor:pointer;">🔍 查明細</button>';
        }

        html += '<div class="policy-row">' +
          '<div class="urgency-dot dot-' + p.urgency + '"></div>' +
          '<div class="policy-type">' + p.type + detailBtnHtml + '</div>' + 
          '<div class="policy-plate">' + (p.plate && p.plate !== '無' ? p.plate : '') + '</div>' +
          '<div class="policy-expiry expiry-' + p.urgency + '">' + p.expiry + '</div>' +
          '<div class="days-badge days-' + p.urgency + '">' + daysText + '</div>' +
        '</div>';
      });

      // 組裝該成員的完整卡片外殼
      membersHtml += '<div class="member-card">' +
        '<div class="member-header">' +
          '<div style="display:flex;align-items:center;gap:8px;">' +
            '<span class="member-name">' + member.name + '</span>' +
            '<span class="member-relation">' + (member.relation || '未設定') + '</span>' +
          '</div>' +
          '<button class="member-share-btn" onclick="shareOnePerson(\'' + encodeURIComponent(JSON.stringify(memberShareData)) + '\')">💬 傳提醒</button>' +
        '</div>' +
        html + // 完美塞入上方 policies.forEach 生成的保單列表
      '</div>';
    });

    var peilinHtml        = '<div class="peilin-note">' + familyData.analysis.replace(/\n/g, '<br>') + '</div>';
    var encodedFamilyData = encodeURIComponent(JSON.stringify({ memberGroups: familyData.memberGroups, id: familyData.id, advisor: advisor }));
    var familyShareBtn    =
      '<div style="display:flex;gap:10px;margin-top:8px;">' +
        '<button class="family-share-btn" style="flex:1;font-size:13px;" onclick="shareFamilyAll(\'' + encodedFamilyData + '\')">💬 傳送整個家庭到期提醒</button>' +
        '<button class="family-share-btn" style="flex:1;font-size:13px;background:#00A3C4;" onclick="generateFamilyImageCard()">📸 製作家庭圖卡</button>' +
      '</div>';

    area.innerHTML =
      '<div class="family-header">' +
        '<div id="familyCardContent">' +
          '<div class="detail-title">👨‍👩‍👧‍👦 家庭保障總覽 <span style="font-size:13px;color:var(--text3);font-weight:normal;">(' + familyData.id + ')</span></div>' +
          summaryHtml + membersHtml + peilinHtml +
        '</div>' +
        familyShareBtn +
      '</div>';
  }

  // ── 分享功能 ──
  // ── 共用：組保單提醒訊息 ──
  function buildPolicyMsg(salutation, type, plateNo, effectiveDate, expiry, premium, details) {
    var msg = "✨【保單到期提醒】✨\n\n";
    msg += salutation + " 您好！\n\n";
    msg += "📋 以下保單即將到期，請檢視原保單內容：\n";
    msg += "────────────────────\n";
    msg += "📄 險種：" + type + "\n";
    if (plateNo && plateNo !== '無') msg += "🚗 車號：" + plateNo + "\n";
    if (effectiveDate && effectiveDate !== '無') msg += "📅 生效日：" + effectiveDate + "\n";
    msg += "⏰ 到期日：" + expiry + "\n";
    if (premium && premium !== '無') msg += "💰 總保費：NT$ " + premium + " 元\n";
    if (details && details.length > 0) {
      msg += "\n📌 保障明細：\n";
      details.forEach(function(d) {
        msg += "  • " + d.name;
        if (d.amount && d.amount !== '無') msg += "　保額 " + d.amount;
        if (d.premium && d.premium !== '無' && d.premium !== '0') msg += "　保費 " + d.premium + " 元";
        msg += "\n";
      });
    }
    msg += "────────────────────\n\n";
    msg += "若需續約或有任何問題，請隨時回覆聯繫 " + ADVISOR_NAME + "！🙌";
    if (ADVISOR_LINE) msg += "\n📲 加入 LINE：https://line.me/ti/p/" + ADVISOR_LINE;
    return msg;
  }

  function quickShare(name, type, policyNo, effectiveDate, expiry, plateNo, premium, maskedId) {
    // 記錄目前的身分證號供稱呼管理快取使用
    window._nicknameInsuredId = maskedId || '';

    withNickname(maskedId || '', name, function(salutation) {
      document.getElementById('loading').style.display = 'block';
      
      // 1. 定義撈取細項明細成功後的回呼邏輯
      var onDetailsLoaded = function(data) {
        document.getElementById('loading').style.display = 'none';
        
        // 智慧型交叉比對：優先採用地方試算表帶回來的最新真實數據，否則才降級用外層卡片的舊資料
        var finalEffective = (data && data.main && data.main.effectiveDate && data.main.effectiveDate !== '無') ? data.main.effectiveDate : effectiveDate;
        var finalPremium   = (data && data.main && data.main.premium       && data.main.premium !== '無')       ? data.main.premium       : premium;
        var finalExpiry    = (data && data.main && data.main.expiry        && data.main.expiry !== '無')        ? data.main.expiry        : expiry;
        
        // 清洗與防護：防範 undefined 或橫線亂跳
        var effStr  = (finalEffective && finalEffective !== 'undefined' && finalEffective !== '—') ? finalEffective : '—';
        var premStr = (finalPremium   && finalPremium   !== 'undefined' && finalPremium   !== '—') ? finalPremium   : '—';
        var expStr  = (finalExpiry    && finalExpiry    !== 'undefined' && finalExpiry    !== '—') ? finalExpiry    : expiry;
        
        var msg = "✨【保單到期提醒】✨\n\n";
        msg += salutation + " 您好！\n\n";
        msg += "📋 以下保單即將到期，請檢視原保單內容：\n";
        msg += "────────────────────\n";
        msg += "📄 險種：" + type + "\n";
        if (plateNo && plateNo !== '無' && plateNo !== 'undefined') {
          msg += "🚗 車號：" + plateNo + "\n";
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
        msg += "若需續約或有任何問題，請隨時回覆聯繫 " + ADVISOR_NAME + "！🙌";
        if (ADVISOR_LINE) msg += "\n📲 加入 LINE：https://line.me/ti/p/" + ADVISOR_LINE;
        
        shareViaLine(msg); // 執行雙軌發送或複製
        
        // 背景自動更新試算表 Z 欄紀錄為「已聯繫」
        if (_directShellUrl) {
          directGasCall('updateRenewalStatus', { policyNo: policyNo, status: '已聯繫' }, null);
        } else {
          gasCall('updateRenewalStatus', { policyNo: policyNo, status: '已聯繫' }, null, null);
        }
      };

      // 2. 定義斷線或降級時的備用邏輯
      var onDetailsFailed = function() {
        document.getElementById('loading').style.display = 'none';
        var effStr  = (effectiveDate && effectiveDate !== 'undefined' && effectiveDate !== '無') ? effectiveDate : '—';
        var premStr = (premium       && premium       !== 'undefined' && premium       !== '無') ? premium       : '—';
        
        var msg = "✨【保單到期提醒】✨\n\n";
        msg += salutation + " 您好！\n\n";
        msg += "📋 以下保單即將到期，請檢視原保單內容：\n";
        msg += "────────────────────\n";
        msg += "📄 險種：" + type + "\n";
        if (plateNo && plateNo !== '無' && plateNo !== 'undefined') {
          msg += "🚗 車號：" + plateNo + "\n";
        }
        msg += "📅 生效日：" + effStr + "\n";
        msg += "⏰ 到期日：" + expiry + "\n";
        msg += "💰 總保費：NT$ " + premStr + " 元\n";
        msg += "────────────────────\n\n";
        msg += "若需續約或有任何問題，請隨時回覆聯繫 " + ADVISOR_NAME + "！🙌";
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

  function shareOnePerson(encodedData) {
    var member         = JSON.parse(decodeURIComponent(encodedData));
    var advisor        = member.advisor || ADVISOR_NAME;
    var urgentPolicies = member.policies.filter(function(p) { return p.urgency === 'urgent' || p.urgency === 'warning'; });
    if (urgentPolicies.length === 0) { alert('此成員目前沒有即將到期的保單。'); return; }
    withNickname(member.maskedId || '', member.name, function(salutation) {
      var msg = "✨【保單到期提醒】✨\n\n";
      msg += salutation + " 您好，\n以下保單即將到期，請確認續約：\n\n";
      urgentPolicies.forEach(function(p) {
        msg += "【" + p.type + "】" + (p.plate !== '無' ? " " + p.plate : "") + "\n到期日：" + p.expiry + "（剩 " + p.daysLeft + " 天）\n\n";
      });
      msg += "如需續約或有任何問題，歡迎隨時聯繫 " + advisor + "！🙌" +
        (ADVISOR_LINE ? "\n📲 加入 LINE：https://line.me/ti/p/" + ADVISOR_LINE : "");
      shareViaLine(msg);
    });
  }

  function shareFamilyAll(encodedData) {
    var d             = JSON.parse(decodeURIComponent(encodedData));
    var advisor       = d.advisor || ADVISOR_NAME;
    var urgentMembers = [];
    d.memberGroups.forEach(function(member) {
      var urgent = member.policies.filter(function(p) { return p.urgency === 'urgent' || p.urgency === 'warning'; });
      if (urgent.length > 0) urgentMembers.push({
        name: member.name, maskedId: member.maskedId || '',
        relation: member.relation, policies: urgent
      });
    });
    if (urgentMembers.length === 0) { alert('此家庭目前沒有即將到期的保單。'); return; }
    // 以「本人」為稱呼對象，找不到本人則用第一位
    var mainMember = urgentMembers.find(function(m) { return m.relation === '本人'; }) || urgentMembers[0];
    withNickname(mainMember.maskedId || '', mainMember.name, function(salutation) {
      var msg = "✨【家庭保單到期提醒】✨\n\n";
      msg += salutation + " 您好，\n以下為貴家庭即將到期的保障，請確認續約安排：\n\n";
      urgentMembers.forEach(function(m) {
        msg += "【" + m.name + "（" + m.relation + "）】\n";
        m.policies.forEach(function(p) {
          msg += "  • " + p.type + (p.plate !== '無' ? " " + p.plate : "") + "　到期：" + p.expiry + "（剩 " + p.daysLeft + " 天）\n";
        });
        msg += "\n";
      });
      msg += "如需協助，歡迎隨時聯繫 " + advisor + "！🙌" +
        (ADVISOR_LINE ? "\n📲 加入 LINE：https://line.me/ti/p/" + ADVISOR_LINE : "");
      shareViaLine(msg);
    });
  }

  function buildMemberShareText(member, advisor) {
    return {
      name: member.name, maskedId: member.maskedId || '',
      relation: member.relation, advisor: advisor || ADVISOR_NAME,
      policies: member.policies.map(function(p) {
        return { type: p.type, plate: p.plate, expiry: p.expiry, daysLeft: p.daysLeft, urgency: p.urgency };
      })
    };
  }

  // ── 家庭圖卡 ──
  function generateFamilyImageCard() {
    var target = document.getElementById('familyCardContent');
    if (!target) return;
    document.getElementById('loading').style.display = 'block';
    html2canvas(target, { scale: 2, backgroundColor: "#ffffff", useCORS: true }).then(function(canvas) {
      document.getElementById('loading').style.display = 'none';
      var imgSrc  = canvas.toDataURL("image/jpeg", 0.92);
      var overlay = document.getElementById('familyImageOverlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'familyImageOverlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.75);z-index:2000;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;';
        document.body.appendChild(overlay);
      }
      overlay._imgSrc = imgSrc;
      overlay.innerHTML =
        '<div style="background:var(--surface);width:100%;max-width:600px;border-radius:20px 20px 0 0;padding:20px;max-height:85vh;overflow-y:auto;box-sizing:border-box;">' +
          '<div style="color:#d32f2f;font-weight:bold;font-size:14px;margin-bottom:10px;text-align:center;">📸 家庭圖卡已生成！</div>' +
          '<img id="familyCardImg" style="width:100%;border-radius:var(--radius-md);box-shadow:0 4px 15px rgba(0,0,0,0.1);margin-bottom:15px;" />' +
          '<div style="display:flex;gap:10px;">' +
            '<button onclick="downloadFamilyImage()" style="flex:1;padding:12px;background:var(--primary);color:white;border:none;border-radius:var(--radius-sm);font-weight:bold;font-size:14px;cursor:pointer;">📥 下載圖卡</button>' +
            '<button onclick="document.getElementById(\'familyImageOverlay\').style.display=\'none\'" style="flex:1;padding:12px;background:#f1f1f1;color:var(--text1);border:none;border-radius:8px;font-weight:bold;font-size:14px;cursor:pointer;">關閉返回</button>' +
          '</div>' +
        '</div>';
      document.getElementById('familyCardImg').src = imgSrc;
      overlay.style.display = 'flex';
    });
  }

  function downloadFamilyImage() {
    var overlay = document.getElementById('familyImageOverlay');
    if (!overlay || !overlay._imgSrc) return;
    var a = document.createElement('a'); a.href = overlay._imgSrc; a.download = '家庭保障總覽.jpg';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  // ── 產險 Modal 操作 ──
  function markVehicleStatus(status) {
    if (!currentPolicyData) return;
    var policyNo = currentPolicyData.main.policyNo;
    var name     = currentPolicyData.main.insuredName;
    var label    = status === '已過戶' ? '已過戶 🔄' : '已報廢 🗑️';
    if (!confirm('確定將「' + name + '」的保單標記為【' + label + '】？\n\n此保單將不再出現在到期提醒名單中。')) return;
    
    // 定義更新成功後的回呼行為
    var onSuccess = function(result) {
      if (result && result.success) {
        alert('✅ 已標記為【' + label + '】');
        closeModal();
        // 貼心加強：標記成功後自動重新整理列表或移除到期欄位紀錄
        if (typeof removeExpiryRow === 'function') removeExpiryRow(policyNo);
        if (typeof removeEarlyWarningRow === 'function') removeEarlyWarningRow(policyNo);
      } else {
        alert('❌ 標記失敗，請稍後再試。');
      }
    };
    
    var onFail = function() {
      alert('❌ 網路連線失敗，請稍後再試。');
    };

    // 【雙軌優化核心】如果是直連捷徑模式，走 directGasCall 直達地方薄殼 Z 欄；否則走中央轉發
    if (_directShellUrl) {
      directGasCall('updateRenewalStatus', { policyNo: policyNo, status: status }, onSuccess, onFail);
    } else {
      gasCall('updateRenewalStatus', { policyNo: policyNo, status: status }, onSuccess, onFail);
    }
  }
  function closeModal() {
    document.getElementById('detailModal').style.display = 'none';
    document.getElementById('travelStatusArea').innerHTML = '';
    currentPolicyData = null;
  }

  // 從缺口清單查看明細後，關閉時返回清單
  function closeModalOrBack() {
    document.getElementById('detailModal').style.display = 'none';
    document.getElementById('travelStatusArea').innerHTML = '';
    currentPolicyData = null;
    if (window._gapListBackup) {
      document.getElementById('resultsList').innerHTML = window._gapListBackup;
      window._gapListBackup = '';
    }
  }

  function generateImageCard() {
    document.getElementById('loading').style.display = 'block';
    html2canvas(document.getElementById('modalBody'), { scale: 2, backgroundColor: "#ffffff" }).then(function(canvas) {
      document.getElementById('generatedImage').src = canvas.toDataURL("image/jpeg", 0.9);
      document.getElementById('modalBody').style.display = 'none';
      document.getElementById('actionButtons').style.display = 'none';
      document.getElementById('imagePreviewContainer').style.display = 'block';
      document.getElementById('loading').style.display = 'none';
    });
  }

  function closeImagePreview() {
    document.getElementById('imagePreviewContainer').style.display = 'none';
    document.getElementById('modalBody').style.display = 'block';
    document.getElementById('actionButtons').style.display = 'flex';
  }

  function copyWarmPitch() {
    if (!currentPolicyData) return;
    var main  = currentPolicyData.main;
    var pitch = "哈囉 " + main.insuredName + " 😊\n您的【" + main.type + "】(車牌:" + main.plateNo +
      ") 即將在 " + main.expiryDate + " 到期囉！有任何需求隨時跟我說，" + ADVISOR_NAME + " 竭誠為您服務！🙌" +
      (ADVISOR_LINE ? "\n📲 加入 LINE：https://line.me/ti/p/" + ADVISOR_LINE : "");
    navigator.clipboard.writeText(pitch).then(function() { alert("✅ 已複製話術！"); });
  }

  function shareToLine() {
    if (!currentPolicyData) return;
    var main    = currentPolicyData.main;
    var details = currentPolicyData.details || [];
    var effectiveDate = main.effectiveDate || main.effectDate || "—";
    
    // 【核心修正】對齊 Library 的最新回傳特徵，優先採用 main.expiry，徹底解決純文字到期日變橫線的問題！
    var expiryDate    = main.expiry || main.expiryDate || "—";
    
    var premium       = main.premium       || "—";
    var insuredName   = main.insuredName   || "—";
    var type          = main.type          || "—";
    var plateNo       = main.plateNo       || "無";
    var maskedId      = main.maskedId      || "";

    // 記錄身分證號並查詢稱呼
    window._nicknameInsuredId = maskedId;
    withNickname(maskedId, insuredName, function(salutation) {
      var msg = "✨【保單內容提醒】✨\n\n";
      msg += salutation + " 您好！\n\n";
      msg += "📋 以下保單為目前【保單內容】：\n";
      msg += "────────────────────\n";
      msg += "📄 險種：" + type + "\n";
      if (plateNo && plateNo !== "無" && plateNo !== "undefined") msg += "🚗 車號：" + plateNo + "\n";
      msg += "📅 生效日：" + effectiveDate + "\n";
      msg += "⏰ 到期日：" + expiryDate + "\n"; // 正確噴出時間！
      if (premium && premium !== "無") msg += "💰 總保費：NT$ " + premium + " 元\n";
      if (details.length > 0) {
        msg += "\n📌 保障明細：\n";
        details.forEach(function(d) {
          msg += "  • " + d.name;
          if (d.amount && d.amount !== "無") msg += " 保額 " + d.amount;
          if (d.premium && d.premium !== "無" && d.premium !== "0") msg += " 保費 " + d.premium + " 元";
          msg += "\n";
        });
      }
      msg += "────────────────────\n\n";
      msg += "若有任何問題，請隨時回覆聯繫 " + ADVISOR_NAME + "！🙌";
      if (ADVISOR_LINE) msg += "\n📲 加入 LINE：https://line.me/ti/p/" + ADVISOR_LINE;
      
      shareViaLine(msg);
      
      // 自動標記為已聯繫
      if (main.policyNo) {
        if (_directShellUrl) {
          directGasCall('updateRenewalStatus', { policyNo: main.policyNo, status: '已聯繫' }, null);
        } else {
          gasCall('updateRenewalStatus', { policyNo: main.policyNo, status: '已聯繫' }, null, null);
        }
      }
    });
  }
  function downloadImage() {
    var a = document.createElement('a');
    a.href = document.getElementById('generatedImage').src;
    a.download = currentPolicyData.main.insuredName + '_保單摘要.jpg';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }


// ══════════════════════════════════════════════════════
// ★ 把 index.html 內 onclick="..." 會呼叫到的函式，以及被
//   尚未拆分的程式碼（buildPolicyMsg）、已拆分的 lock.js
//   （closeModalOrBack）當作共用工具呼叫的函式，expose 到全域
// ══════════════════════════════════════════════════════
window.quickShare              = quickShare;
window.shareOnePerson          = shareOnePerson;
window.shareFamilyAll          = shareFamilyAll;
window.generateFamilyImageCard = generateFamilyImageCard;
window.downloadFamilyImage     = downloadFamilyImage;
window.markVehicleStatus       = markVehicleStatus;
window.closeModalOrBack        = closeModalOrBack;
window.generateImageCard       = generateImageCard;
window.closeImagePreview       = closeImagePreview;
window.copyWarmPitch           = copyWarmPitch;
window.shareToLine             = shareToLine;
window.downloadImage           = downloadImage;
window.buildPolicyMsg          = buildPolicyMsg;
window.renderFamilyReport      = renderFamilyReport;
