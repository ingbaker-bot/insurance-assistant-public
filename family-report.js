// ══════════════════════════════════════════════════════
// family-report.js — 家庭保障報表（截圖/LINE分享）（ES Module）
// 原本位於 index.html 第 5481–5843 行，拆分示範
// 依賴（來自尚未拆分的其他區塊，皆為全域變數/函式，載入順序已確保先於本模組執行）：
//   _directShellUrl, directGasCall, gasCall, showBdToast
//   html2canvas（由 index.html <head> 的 CDN <script> 全域載入）
// ══════════════════════════════════════════════════════

// ══════════════════════════════════════════════
// ★ 家庭保障報表功能
// ══════════════════════════════════════════════

function openFamilyTableReport(familyId) {
  if (!familyId || familyId === '無') { alert('此保戶無家庭編號'); return; }
  document.getElementById('famTableTitle').textContent = familyId;
  document.getElementById('famTableBody').innerHTML =
    '<div style="text-align:center;color:var(--text3);padding:30px;">載入中...</div>';
  document.getElementById('famTableModal').style.display = 'block';
  document.body.style.overflow = 'hidden';

  var onOk = function(data) { _renderFamTable(data); };
  var onErr= function()    { document.getElementById('famTableBody').innerHTML =
    '<div style="text-align:center;color:#d32f2f;padding:30px;">讀取失敗，請重試</div>'; };

  if (_directShellUrl) directGasCall('getFamilyReport', { id: familyId }, onOk, onErr);
  else                 gasCall('getFamilyReport',        { id: familyId }, onOk, onErr);
}

function closeFamTableModal() {
  document.getElementById('famTableModal').style.display = 'none';
  document.body.style.overflow = '';
}

function _renderFamTable(data) {
  if (!data || !data.memberGroups) {
    document.getElementById('famTableBody').innerHTML =
      '<div style="text-align:center;color:var(--text3);padding:30px;">此家庭暫無保單資料</div>';
    return;
  }

  // 更新標題
  var totalPremium = 0;
  data.memberGroups.forEach(function(m) {
    m.policies.forEach(function(p) {
      if (p.status !== '退保' && p.urgency !== 'expired') {
        totalPremium += parseInt(String(p.premium).replace(/,/g,'')) || 0;
      }
    });
  });
  document.getElementById('famTableTitle').textContent =
    data.id + '　共 ' + data.summary.total + ' 張・保費合計 NT$' +
    totalPremium.toLocaleString();

  // ── 分類保單 ──
  var carPolicies   = [];  // 汽車強制 + 任意
  var motoPolicies  = [];  // 機車強制 + 任意
  var healthPolicies= [];  // 健康傷害險
  var firePolicies  = [];  // 住宅火險

  var todayMs = new Date().setHours(0,0,0,0);

  data.memberGroups.forEach(function(m) {
    m.policies.forEach(function(p) {
      var t  = p.type || '';
      var rs = (p.renewStatus || '').trim();

      // ★ 修正1：Z欄「已報廢」或「已過戶」→ 直接排除，車已不屬於被保人
      if (rs === '已報廢' || rs === '已過戶') return;

      // ★ 修正2：到期日 < 今天 → 舊保單，排除（不含非富邦標記的他家保單）
      if (!rs.includes('他家') && p.daysLeft !== null && p.daysLeft < 0) return;

      var item = Object.assign({}, p, { memberName: m.name, relation: m.relation });
      if      (t.includes('汽車'))   carPolicies.push(item);
      else if (t.includes('機車'))   motoPolicies.push(item);
      else if (t.includes('住宅') || t.includes('火險')) firePolicies.push(item);
      else if (t.includes('健康') || t.includes('傷害') ||
               t.includes('意外') || t.includes('傷殘')) healthPolicies.push(item);
    });
  });

  // 車牌分組排序（強制先、任意後）
  function groupByPlate(policies) {
    var map = {};
    policies.forEach(function(p) {
      var key = p.plate || '無車牌';
      if (!map[key]) map[key] = [];
      map[key].push(p);
    });
    Object.keys(map).forEach(function(k) {
      map[k].sort(function(a, b) {
        var aComp = a.type.includes('強制') ? 0 : 1;
        var bComp = b.type.includes('強制') ? 0 : 1;
        return aComp - bComp;
      });
    });
    return map;
  }

  var today = new Date(); today.setHours(0,0,0,0);

  // ── 是否非富邦（Z欄含「他家」）──
  function isOtherCompany(p) {
    return p.renewStatus && p.renewStatus.includes('他家');
  }

  // ── 到期日樣式（60天內標紅）──
  function expiryStyle(p) {
    if (isOtherCompany(p)) return 'color:var(--text3);';
    if (!p.expiry || p.urgency === 'expired') return 'color:#bbb;';
    if (p.daysLeft !== null && p.daysLeft <= 60)
      return 'color:#A32D2D;font-weight:500;';
    return 'color:var(--text2);';
  }

  // ── 險種標籤 ──
  function typeTag(t, isOther) {
    if (isOther) return '<span style="background:#F5F5F5;color:var(--text3);font-size:11px;padding:2px 7px;border-radius:4px;border:1px solid #DDD;">'+t+'</span>';
    if (t.includes('強制')) return '<span style="background:#F1EFE8;color:#5F5E5A;font-size:11px;padding:2px 7px;border-radius:4px;">強制</span>';
    if (t.includes('汽車')) return '<span style="background:#E6F1FB;color:#0C447C;font-size:11px;padding:2px 7px;border-radius:4px;">任意</span>';
    if (t.includes('機車')) return '<span style="background:#EEEDFE;color:#3C3489;font-size:11px;padding:2px 7px;border-radius:4px;">任意</span>';
    if (t.includes('住宅')||t.includes('火險')) return '<span style="background:#FAEEDA;color:#633806;font-size:11px;padding:2px 7px;border-radius:4px;">火險</span>';
    return '<span style="background:#EAF3DE;color:#27500A;font-size:11px;padding:2px 7px;border-radius:4px;">'+t+'</span>';
  }

  // ── 非富邦標示 ──
  function otherBadge(p) {
    if (!isOtherCompany(p)) return '';
    var note = p.renewStatus.replace('他家', '').trim() || '他家';
    return '<span style="background:#FFF3E0;color:#DC2626;font-size:10px;padding:1px 6px;border-radius:4px;margin-left:4px;border:1px solid #FFB74D;">'+note+'</span>';
  }

  // ── 表格共用 thead ──
  function thead(cols) {
    return '<thead><tr style="background:#F8F9FA;">' +
      cols.map(function(c) {
        return '<th style="padding:7px 10px;text-align:' + (c.right?'right':'left') +
          ';font-size:12px;font-weight:500;color:var(--text2);border-bottom:1px solid #DDD;white-space:nowrap;' +
          (c.w?'width:'+c.w:'')+'">' + c.label + '</th>';
      }).join('') + '</tr></thead>';
  }

  // ── Section 標題 ──
  // 各 Section 色系設定
  var sectionColors = {
    '汽車險':   { bg:'#E6F1FB', border:'#85B7EB', text:'#0C447C' },
    '機車險':   { bg:'#EEEDFE', border:'#AFA9EC', text:'#3C3489' },
    '健康傷害險':{ bg:'#EAF3DE', border:'#97C459', text:'#27500A' },
    '住宅火險': { bg:'#FAEEDA', border:'#EF9F27', text:'#633806' }
  };

  function sectionTitle(label, count, subtotal) {
    var c = sectionColors[label] || { bg:'#F5F5F5', border:'#DDD', text:'#555' };
    return '<div style="display:flex;justify-content:space-between;align-items:center;' +
      'background:' + c.bg + ';border-left:4px solid ' + c.border + ';' +
      'padding:10px 14px;border-radius:0 6px 6px 0;margin-bottom:0;">' +
      '<span style="font-size:13px;font-weight:500;color:' + c.text + ';">' +
        label + ' <span style="font-size:12px;font-weight:400;opacity:.8;">(' + count + ' 張)</span></span>' +
      (subtotal ? '<span style="font-size:13px;font-weight:500;color:' + c.text + ';">小計 NT$' + subtotal.toLocaleString() + '</span>' : '') +
      '</div>';
  }

  // ── 計算小計 ──
  function calcSubtotal(policies) {
    return policies.reduce(function(s, p) {
      if (!isOtherCompany(p) && p.urgency !== 'expired')
        s += parseInt(String(p.premium).replace(/,/g,'')) || 0;
      return s;
    }, 0);
  }

  var html = '<div id="famTableContent" style="color:var(--text1);">';

  // ── 1. 汽車險 ──
  if (carPolicies.length > 0) {
    var carSub = calcSubtotal(carPolicies);
    html += '<div style="margin-bottom:24px;">';
    html += sectionTitle('汽車險', carPolicies.length, carSub);
    html += '<table style="width:100%;border-collapse:collapse;font-size:13px;">';
    html += thead([
      {label:'',w:'32px'},{label:'險種',w:'80px'},{label:'車牌',w:'90px'},
      {label:'被保人',w:'70px'},{label:'保單號碼'},{label:'生效日',w:'72px'},
      {label:'到期日',w:'72px'},{label:'保費',w:'64px',right:true}
    ]);
    html += '<tbody>';
    var carGroups = groupByPlate(carPolicies);
    var carSeq = 1;
    Object.keys(carGroups).forEach(function(plate) {
      var rows = carGroups[plate];
      // 分組標題列（含左色條）
      var members = [...new Set(rows.map(function(r){ return r.memberName; }))].join(' / ');
      html += '<tr><td colspan="8" style="padding:6px 10px 6px 14px;background:#EEF4FA;' +
        'font-size:12px;font-weight:500;color:#185FA5;border-bottom:0.5px solid #C8DDEF;' +
        'border-left:3px solid #378ADD;">' +
        '<span style="font-family:monospace;letter-spacing:1px;font-size:13px;">' + plate + '</span>' +
        '<span style="margin-left:10px;color:var(--text2);font-weight:400;">' + members + '</span></td></tr>';
      rows.forEach(function(p) {
        var isOther = isOtherCompany(p);
        html += '<tr style="' + (isOther?'opacity:0.7;':'') + '">' +
          '<td style="padding:7px 10px;color:var(--text3);font-size:12px;font-weight:500;">' + carSeq++ + '</td>' +
          '<td style="padding:7px 10px;">' + typeTag(p.type, isOther) + otherBadge(p) + '</td>' +
          '<td style="padding:7px 10px;font-family:monospace;font-size:12px;color:var(--text1);font-weight:500;">' + (p.plate||'—') + '</td>' +
          '<td style="padding:7px 10px;font-size:12px;color:var(--text1);font-weight:500;">' + p.memberName + '</td>' +
          '<td style="padding:7px 10px;font-size:12px;color:var(--text2);font-family:monospace;font-weight:500;">' + p.policyNo + '</td>' +
          '<td style="padding:7px 10px;font-size:12px;color:var(--text2);font-weight:500;">' + (p.effectiveDate||'—') + '</td>' +
          '<td style="padding:7px 10px;font-size:12px;font-weight:500;' + expiryStyle(p) + '">' + (p.expiry||'—') + '</td>' +
          '<td style="padding:7px 10px;text-align:right;font-size:12px;color:var(--text1);font-weight:500;">' +
            (isOther ? '<span style="color:#bbb;">—</span>' :
             (parseInt(String(p.premium).replace(/,/g,''))||0).toLocaleString()) + '</td>' +
          '</tr>';
      });
    });
    html += '</tbody></table></div>';
  }

  // ── 2. 機車險 ──
  if (motoPolicies.length > 0) {
    var motoSub = calcSubtotal(motoPolicies);
    html += '<div style="margin-bottom:24px;">';
    html += sectionTitle('機車險', motoPolicies.length, motoSub);
    html += '<table style="width:100%;border-collapse:collapse;font-size:13px;">';
    html += thead([
      {label:'',w:'32px'},{label:'險種',w:'80px'},{label:'車牌',w:'90px'},
      {label:'被保人',w:'70px'},{label:'保單號碼'},{label:'生效日',w:'72px'},
      {label:'到期日',w:'72px'},{label:'保費',w:'64px',right:true}
    ]);
    html += '<tbody>';
    var motoGroups = groupByPlate(motoPolicies);
    var motoSeq = 1;
    Object.keys(motoGroups).forEach(function(plate) {
      var rows = motoGroups[plate];
      var members = [...new Set(rows.map(function(r){ return r.memberName; }))].join(' / ');
      html += '<tr><td colspan="8" style="padding:6px 10px 6px 14px;background:#EEEDF9;' +
        'font-size:12px;font-weight:500;color:#3C3489;border-bottom:0.5px solid #C5C2EA;' +
        'border-left:3px solid #7F77DD;">' +
        '<span style="font-family:monospace;letter-spacing:1px;font-size:13px;">' + plate + '</span>' +
        '<span style="margin-left:10px;color:var(--text2);font-weight:400;">' + members + '</span></td></tr>';
      rows.forEach(function(p) {
        var isOther = isOtherCompany(p);
        html += '<tr style="' + (isOther?'opacity:0.7;':'') + '">' +
          '<td style="padding:7px 10px;color:var(--text3);font-size:12px;font-weight:500;">' + motoSeq++ + '</td>' +
          '<td style="padding:7px 10px;">' + typeTag(p.type, isOther) + otherBadge(p) + '</td>' +
          '<td style="padding:7px 10px;font-family:monospace;font-size:12px;color:var(--text1);font-weight:500;">' + (p.plate||'—') + '</td>' +
          '<td style="padding:7px 10px;font-size:12px;color:var(--text1);font-weight:500;">' + p.memberName + '</td>' +
          '<td style="padding:7px 10px;font-size:12px;color:var(--text2);font-family:monospace;font-weight:500;">' + p.policyNo + '</td>' +
          '<td style="padding:7px 10px;font-size:12px;color:var(--text2);font-weight:500;">' + (p.effectiveDate||'—') + '</td>' +
          '<td style="padding:7px 10px;font-size:12px;font-weight:500;' + expiryStyle(p) + '">' + (p.expiry||'—') + '</td>' +
          '<td style="padding:7px 10px;text-align:right;font-size:12px;color:var(--text1);font-weight:500;">' +
            (isOther ? '<span style="color:#bbb;">—</span>' :
             (parseInt(String(p.premium).replace(/,/g,''))||0).toLocaleString()) + '</td>' +
          '</tr>';
      });
    });
    html += '</tbody></table></div>';
  }

  // ── 3. 健康傷害險 ──
  if (healthPolicies.length > 0) {
    var healthSub = calcSubtotal(healthPolicies);
    html += '<div style="margin-bottom:24px;">';
    html += sectionTitle('健康傷害險', healthPolicies.length, healthSub);
    html += '<table style="width:100%;border-collapse:collapse;font-size:13px;">';
    html += thead([
      {label:'',w:'32px'},{label:'被保人',w:'70px'},{label:'保單號碼'},
      {label:'生效日',w:'72px'},{label:'到期日',w:'72px'},{label:'保費',w:'64px',right:true}
    ]);
    html += '<tbody>';
    healthPolicies.forEach(function(p, i) {
      var isOther = isOtherCompany(p);
      html += '<tr>' +
        '<td style="padding:7px 10px;color:var(--text3);font-size:12px;font-weight:500;">' + (i+1) + '</td>' +
        '<td style="padding:7px 10px;font-size:12px;color:var(--text1);font-weight:500;">' + p.memberName + otherBadge(p) + '</td>' +
        '<td style="padding:7px 10px;font-size:12px;color:var(--text2);font-family:monospace;font-weight:500;">' + p.policyNo + '</td>' +
        '<td style="padding:7px 10px;font-size:12px;color:var(--text2);font-weight:500;">' + (p.effectiveDate||'—') + '</td>' +
        '<td style="padding:7px 10px;font-size:12px;font-weight:500;' + expiryStyle(p) + '">' + (p.expiry||'—') + '</td>' +
        '<td style="padding:7px 10px;text-align:right;font-size:12px;color:var(--text1);">' +
          (isOther ? '<span style="color:#bbb;">—</span>' :
           (parseInt(String(p.premium).replace(/,/g,''))||0).toLocaleString()) + '</td>' +
        '</tr>';
    });
    html += '</tbody></table></div>';
  }

  // ── 4. 住宅火險 ──
  if (firePolicies.length > 0) {
    var fireSub = calcSubtotal(firePolicies);
    html += '<div style="margin-bottom:24px;">';
    html += sectionTitle('住宅火險', firePolicies.length, fireSub);
    html += '<table style="width:100%;border-collapse:collapse;font-size:13px;">';
    html += thead([
      {label:'',w:'32px'},{label:'被保人',w:'70px'},{label:'保單號碼'},
      {label:'生效日',w:'72px'},{label:'到期日',w:'72px'},{label:'保費',w:'64px',right:true}
    ]);
    html += '<tbody>';
    firePolicies.forEach(function(p, i) {
      var isOther = isOtherCompany(p);
      html += '<tr>' +
        '<td style="padding:7px 10px;color:var(--text3);font-size:12px;font-weight:500;">' + (i+1) + '</td>' +
        '<td style="padding:7px 10px;font-size:12px;color:var(--text1);font-weight:500;">' + p.memberName + otherBadge(p) + '</td>' +
        '<td style="padding:7px 10px;font-size:12px;color:var(--text2);font-family:monospace;font-weight:500;">' + p.policyNo + '</td>' +
        '<td style="padding:7px 10px;font-size:12px;color:var(--text2);font-weight:500;">' + (p.effectiveDate||'—') + '</td>' +
        '<td style="padding:7px 10px;font-size:12px;font-weight:500;' + expiryStyle(p) + '">' + (p.expiry||'—') + '</td>' +
        '<td style="padding:7px 10px;text-align:right;font-size:12px;color:var(--text1);">' +
          (isOther ? '<span style="color:#bbb;">—</span>' :
           (parseInt(String(p.premium).replace(/,/g,''))||0).toLocaleString()) + '</td>' +
        '</tr>';
    });
    html += '</tbody></table></div>';
  }

  // ── 合計列 ──
  html += '<div style="border-top:2px solid #EEE;padding:10px 0 4px;' +
    'display:flex;justify-content:space-between;align-items:center;">' +
    '<span style="font-size:13px;color:var(--text2);font-weight:500;">顧問：' + (data.advisorName||'—') + '</span>' +
    '<div style="text-align:right;">' +
    '<span style="font-size:13px;color:var(--text2);font-weight:500;margin-right:8px;">有效保費合計</span>' +
    '<span style="font-size:16px;font-weight:500;color:#1565C0;">NT$' +
    totalPremium.toLocaleString() + '</span></div></div>';

  html += '</div>'; // famTableContent

  document.getElementById('famTableBody').innerHTML = html;
}

// ── 下載圖片 ──
function downloadFamTable() {
  var el = document.getElementById('famTableContent');
  if (!el || typeof html2canvas === 'undefined') {
    alert('請稍後再試');
    return;
  }
  html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
    .then(function(canvas) {
      var a = document.createElement('a');
      a.download = '家庭保障報表_' + (document.getElementById('famTableTitle').textContent||'').split('　')[0] + '.png';
      a.href = canvas.toDataURL('image/png');
      a.click();
      showBdToast('📥 已下載報表圖片');
    });
}

// ── LINE 分享 ──
function shareFamTableLine() {
  var el = document.getElementById('famTableContent');
  if (!el || typeof html2canvas === 'undefined') { alert('請稍後再試'); return; }
  html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
    .then(function(canvas) {
      canvas.toBlob(function(blob) {
        if (navigator.clipboard && window.ClipboardItem) {
          navigator.clipboard.write([new ClipboardItem({'image/png': blob})])
            .then(function() {
              showBdToast('✅ 已複製！正在開啟 LINE...');
              setTimeout(function(){ window.location.href = 'line://'; }, 800);
            })
            .catch(function() { _fallbackFamLine(canvas); });
        } else {
          _fallbackFamLine(canvas);
        }
      });
    });
}

function _fallbackFamLine(canvas) {
  var a = document.createElement('a');
  a.download = '家庭保障報表.png';
  a.href = canvas.toDataURL('image/png');
  a.click();
  setTimeout(function(){ window.location.href = 'line://'; }, 600);
  showBdToast('📥 已下載，請手動傳入 LINE');
}


// ══════════════════════════════════════════════════════
// ★ 把 index.html 內 onclick="..." 會呼叫到的函式 expose 到全域
// ══════════════════════════════════════════════════════
window.openFamilyTableReport = openFamilyTableReport;
window.closeFamTableModal    = closeFamTableModal;
window.downloadFamTable      = downloadFamTable;
window.shareFamTableLine     = shareFamTableLine;
