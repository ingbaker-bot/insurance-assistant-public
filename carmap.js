// ══════════════════════════════════════════════════════
// carmap.js — 車險保障矩陣比對卡（ES Module）
// 原本位於 index.html 第 6415–6936 行，拆分示範
// 依賴：html2canvas（由 index.html <head> 的 CDN <script> 全域載入，模組內可直接使用 window.html2canvas）
// ══════════════════════════════════════════════════════

function openCarMapFromModal() {
  if (typeof _openCarMapFromModal === "function") {
    _openCarMapFromModal();
  } else {
    alert("請先開啟一張保單");
  }
}
// ════════════════════════════════════
// ★ 車險保障矩陣定義
// cols: [我方駕駛, 我方乘客, 我方車輛, 對方駕/乘/行人, 對方車輛財產]
// 'ok_if_has' = 有保才打勾, 'na' = 不適用
// ════════════════════════════════════
var CMP_MATRIX_DEF = [
  { label:'強制責任險', keywords:['強制'],
    amtMatch: function(k){ return k.includes('強制'); },
    amtExclude: null,
    cols:['na','ok_if_has','na','ok_if_has','na'] },
  { label:'第三人體傷', keywords:['第三人責任','第三人體傷','體傷'],
    // 排除：超額、慰問金、失能增額、殘廢增額、附加
    amtMatch: function(k){ return (k.includes('第三人責任') || k.includes('第三人體傷') || k.includes('體傷')); },
    amtExclude: function(k){ return k.includes('超額') || k.includes('慰問') || k.includes('失能增額') || k.includes('殘廢增額') || k.includes('財損'); },
    cols:['na','na','na','ok_if_has','na'] },
  { label:'第三人財損', keywords:['第三人財損','財損'],
    amtMatch: function(k){ return k.includes('財損'); },
    amtExclude: null,
    cols:['na','na','na','na','ok_if_has'] },
  { label:'超額責任險', keywords:['超額'],
    amtMatch: function(k){ return k.includes('超額責任'); },
    amtExclude: null,
    cols:['na','toggle','na','ok_if_has','ok_if_has'] },
  { label:'乘客責任險', keywords:['乘客責任','增額乘客責任'],
    amtMatch: function(k){ return k.includes('乘客責任'); },
    amtExclude: null,
    cols:['na','ok_if_has','na','na','na'] },
  { label:'駕駛人傷害', keywords:['駕駛人傷害','單一事故駕駛人'],
    // 多筆時取金額最大值（在 _cmpGetAmount 處理）
    amtMatch: function(k){ return k.includes('駕駛人傷害') || k.includes('單一事故駕駛人'); },
    amtExclude: function(k){ return k.includes('殘廢增額') || k.includes('失能增額'); },
    amtMax: true,
    cols:['ok_if_has','na','na','na','na'] },
  { label:'車體險',
    keywords:['車體損失險'],
    // 精確：必須含「車體損失險」且含甲/乙/丙/丁式，排除附加/全損/殘值/零件
    amtMatch: function(k){
      return k.includes('車體損失險') &&
             (k.includes('甲式') || k.includes('乙式') || k.includes('丙式') || k.includes('丁式'));
    },
    amtExclude: function(k){ return k.includes('全損') || k.includes('殘值') || k.includes('零件') || k.includes('附加'); },
    cols:['na','na','ok_if_has','na','na'] },
  { label:'竊盜險',     keywords:['竊盜損失','竊盜'],
    amtMatch: function(k){ return k.includes('竊盜'); },
    amtExclude: null,
    cols:['na','na','ok_if_has','na','na'] }
];
var CMP_ADDON_DEF = [
  { label:'道路救援', keywords:['道路救援'] },
  { label:'刑事訴訟', keywords:['刑事','刑事訴訟'] }
];

// ── 狀態 ──
var _cmpManualCells   = {};
var _cmpManualAddons  = {};
var _cmpManualAmounts = {};  // { "ri_ci": "500萬" } 手動勾選時填入的保額
var _cmpCurrentData  = null;  // { plate, insured, expiry, insuredTypes }

// ════════════════════════════════════
// ★ 從保單詳情 Modal 開啟（主要入口）
// ════════════════════════════════════
function _openCarMapFromModal() {
  if (!currentPolicyData || !currentPolicyData.main) {
    alert('請先開啟一張保單');
    return;
  }
  var main     = currentPolicyData.main;
  var details  = currentPolicyData.details || [];

  // ── 建立險種清單 & 保額對照表 ──
  var types = [main.type || ''];
  var insuredAmounts = {};  // { '第三人責任險': '3,000萬', ... }
  details.forEach(function(d) {
    if (d.name) {
      types.push(d.name);
      if (d.amount) insuredAmounts[d.name] = _cmpFmtAmount(d.amount);
    }
  });

  // ★ 強制險 & 任意險到期日（由 Libcode getPolicyDetails 從同車牌所有保單計算好）
  var compulsoryExpiry = main.compulsoryExpiry || '';
  var voluntaryExpiry  = main.voluntaryExpiry  || '';

  // 若 Libcode 沒傳回（舊版相容）：fallback 用目前保單險種判斷
  if (!compulsoryExpiry && !voluntaryExpiry) {
    var isCompulsory = (main.type || '').indexOf('強制') !== -1;
    if (isCompulsory) { compulsoryExpiry = main.expiry || main.expiryDate || ''; }
    else              { voluntaryExpiry  = main.expiry || main.expiryDate || ''; }
  }

  _cmpCurrentData = {
    plate:           main.plateNo     || '—',
    insured:         main.insuredName || '—',
    expiry:          compulsoryExpiry,   // ★ 強制險到期日
    voluntaryExpiry: voluntaryExpiry,    // ★ 任意險到期日
    insuredTypes:    types,
    insuredAmounts:  insuredAmounts      // ★ 險種→保額對照表
  };

  _cmpManualCells  = {};
  _cmpManualAddons = {};
  document.getElementById('cmpCarSelector').style.display = 'none';
  _cmpRenderCard();
  document.getElementById('carMapOverlay').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeCarMapPanel() {
  document.getElementById('carMapOverlay').style.display = 'none';
  document.body.style.overflow = '';
}

document.getElementById('carMapOverlay').addEventListener('click', function(e) {
  if (e.target === this) closeCarMapPanel();
});

// ════════════════════════════════════
// ★ 渲染圖卡
// ════════════════════════════════════
function _cmpRenderCard() {
  var d = _cmpCurrentData;

  // 頂部資訊
  document.getElementById('cmpPlate').textContent   = d.plate;
  document.getElementById('cmpInsured').textContent = '被保險人：' + d.insured;

  // ★ 強制險到期日（抓不到顯示「點擊輸入」）
  var expiryEl = document.getElementById('cmpExpiry');
  expiryEl.textContent = d.expiry || '✏️ 點擊輸入';
  expiryEl.className   = 'card-expiry-val' + (_cmpIsExpiringSoon(d.expiry) ? ' expiring' : (!d.expiry ? ' cmp-empty' : ''));

  // ★ 任意險到期日（一律顯示，抓不到顯示「點擊輸入」）
  var volEl    = document.getElementById('cmpVoluntaryExpiry');
  var volLabel = document.getElementById('cmpVoluntaryLabel');
  if (volEl && volLabel) {
    volEl.textContent    = d.voluntaryExpiry || '✏️ 點擊輸入';
    volEl.className      = 'card-expiry-val' + (_cmpIsExpiringSoon(d.voluntaryExpiry) ? ' expiring' : (!d.voluntaryExpiry ? ' cmp-empty' : ''));
    volEl.style.display    = '';
    volLabel.style.display = '';
  }

  // 顧問資訊（直接用系統現有全域變數）
  document.getElementById('cmpAdvisor').textContent      = ADVISOR_NAME  || '';
  document.getElementById('cmpAdvisorPhone').textContent = ADVISOR_PHONE || '';

  // 製圖日期
  var now = new Date();
  document.getElementById('cmpGenDate').textContent =
    (now.getFullYear()-1911) + '/' + (now.getMonth()+1) + '/' + now.getDate() + ' 製';

  // 渲染矩陣 & 附加保障
  _cmpRenderMatrix(d.insuredTypes);
  _cmpRenderAddons(d.insuredTypes);
}

// ── 判斷是否包含關鍵字 ──
function _cmpHasKeyword(types, keywords) {
  return keywords.some(function(kw) {
    return types.some(function(t) { return String(t).indexOf(kw) !== -1; });
  });
}

// ── 主矩陣渲染 ──
function _cmpRenderMatrix(types) {
  var tbody   = document.getElementById('cmpMatrixBody');
  var amounts = (_cmpCurrentData && _cmpCurrentData.insuredAmounts) || {};
  tbody.innerHTML = '';
  CMP_MATRIX_DEF.forEach(function(row, ri) {
    var has    = _cmpHasKeyword(types, row.keywords);
    // ★ 精準保額抓取：用每個 row 的 amtMatch / amtExclude 規則
    var amount = '';
    if (has && row.amtMatch) {
      var matched = [];
      Object.keys(amounts).forEach(function(k) {
        if (row.amtMatch(k) && !(row.amtExclude && row.amtExclude(k))) {
          matched.push(amounts[k]);
        }
      });
      if (matched.length > 0) {
        if (row.amtMax) {
          // 取金額最大值（駕駛人傷害有多筆時）
          var maxVal = 0;
          matched.forEach(function(v) {
            var n = _cmpParseAmount(v);
            if (n > maxVal) { maxVal = n; amount = v; }
          });
        } else {
          amount = matched[0];
        }
      }
    }
    var tr = document.createElement('tr');

    var tdL = document.createElement('td');
    tdL.className   = 'td-label';
    tdL.textContent = row.label;
    tr.appendChild(tdL);

    row.cols.forEach(function(colDef, ci) {
      if (ci === 3) {
        var sep = document.createElement('td');
        sep.className = 'col-group-sep';
        tr.appendChild(sep);
      }
      var key = ri + '_' + ci;
      var td  = document.createElement('td');
      var amtHtml = (has && amount) ? '<div class="cell-amount">' + amount + '</div>' : '';

      if (colDef === 'na') {
        td.innerHTML = '<div class="cell-wrap"><div class="cell na">—</div></div>';
      } else if (colDef === 'toggle') {
        var isManual   = !!_cmpManualCells[key];
        var manualAmt  = _cmpManualAmounts[key] || '';
        var manualHtml = manualAmt ? '<div class="cell-amount">' + manualAmt + '</div>' : '';
        if (isManual) {
          td.innerHTML = '<div class="cell-wrap"><div class="cell manual" onclick="_cmpToggleCell(\'' + key + '\')" title="點擊取消">✓' + manualHtml + '</div></div>';
        } else {
          td.innerHTML = '<div class="cell-wrap"><div class="cell miss" onclick="_cmpOpenManualInput(\'' + key + '\')" title="點擊勾選並輸入保額">○</div></div>';
        }
      } else {
        var isManual   = !!_cmpManualCells[key];
        var manualAmt  = _cmpManualAmounts[key] || '';
        var manualHtml = manualAmt ? '<div class="cell-amount">' + manualAmt + '</div>' : '';
        if (has) {
          // ★ 綠底格子也可點擊修改保額（_cmpManualAmounts 覆蓋系統值）
          var displayAmt  = _cmpManualAmounts[key] || amount;
          var displayHtml = displayAmt ? '<div class="cell-amount">' + displayAmt + '</div>' : '';
          td.innerHTML = '<div class="cell-wrap"><div class="cell ok" onclick="_cmpOpenAmountEdit(\'' + key + '\',\'' + (amount||'') + '\')" title="點擊修改保額" style="cursor:pointer;">✓' + displayHtml + '</div></div>';
        } else if (isManual) {
          td.innerHTML = '<div class="cell-wrap"><div class="cell manual" onclick="_cmpOpenManualInput(\'' + key + '\')" title="點擊修改保額">✓' + manualHtml + '</div></div>';
        } else {
          td.innerHTML = '<div class="cell-wrap"><div class="cell miss" onclick="_cmpOpenManualInput(\'' + key + '\')" title="點擊勾選並輸入保額">○</div></div>';
        }
      }
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
    var sepTr = document.createElement('tr');
    sepTr.className = 'matrix-row-sep';
    sepTr.innerHTML = '<td colspan="7"><div class="sep-line"></div></td>';
    tbody.appendChild(sepTr);
  });
}

// ── 附加保障渲染 ──
function _cmpRenderAddons(types) {
  var list    = document.getElementById('cmpAddonList');
  var amounts = (_cmpCurrentData && _cmpCurrentData.insuredAmounts) || {};
  list.innerHTML = '';
  CMP_ADDON_DEF.forEach(function(addon) {
    var has      = _cmpHasKeyword(types, addon.keywords);
    var isManual = !!_cmpManualAddons[addon.label];
    var cls      = has ? 'ok' : (isManual ? 'manual' : 'miss');
    var icon     = (has || isManual) ? '✓' : '○';
    // 找保額
    var amount = '';
    if (has) {
      Object.keys(amounts).forEach(function(k) {
        if (!amount && addon.keywords.some(function(kw){ return k.indexOf(kw) !== -1; })) {
          amount = amounts[k];
        }
      });
    }
    var statusTxt = has
      ? ('已投保' + (amount ? '　' + amount : ''))
      : (isManual ? '手動標記' : '未投保');
    var div = document.createElement('div');
    div.className = 'addon-item';
    if (!has) div.style.cursor = 'pointer';
    div.innerHTML =
      '<div class="addon-cell ' + cls + '">' + icon + '</div>' +
      '<div><div class="addon-name">' + addon.label + '</div>' +
      '<div class="addon-status">' + statusTxt + '</div></div>';
    if (!has) div.onclick = function(){ _cmpToggleAddon(addon.label); };
    list.appendChild(div);
  });
}

// ── 保額格式化：數字 → 萬/億，字串直接傳回 ──
function _cmpFmtAmount(val) {
  if (!val) return '';
  var str = String(val).replace(/,/g, '').trim();
  var num = parseFloat(str);
  if (isNaN(num)) return str;  // 非數字（例如「市值」）直接回傳
  if (num >= 100000000) return (num / 100000000).toFixed(0) + '億';
  if (num >= 10000)     return (num / 10000).toFixed(0) + '萬';
  return str;
}

// ── 手動勾選：點擊開啟保額輸入面板 ──
var _cmpManualInputKey  = '';
var _cmpAmountEditKey   = '';
var _cmpAmountEditOrig  = '';  // 系統原始保額

// ── 綠底格子：只修改保額，不取消勾選 ──
function _cmpOpenAmountEdit(key, origAmt) {
  _cmpAmountEditKey  = key;
  _cmpAmountEditOrig = origAmt;
  document.getElementById('cmpManualInputTitle').textContent = '✏️ 修改保額（空白則恢復系統值）';
  document.getElementById('cmpManualAmtInput').value = _cmpManualAmounts[key] || '';
  var cancelBtn = document.getElementById('cmpManualCancelBtn');
  cancelBtn.textContent      = '恢復系統值';
  cancelBtn.style.background = '#F5F5F5';
  cancelBtn.style.color      = '#666';
  // 確認鈕改成只存保額
  cancelBtn.onclick = function() {
    delete _cmpManualAmounts[_cmpAmountEditKey];
    _cmpCloseManalInput();
    _cmpRenderMatrix(_cmpCurrentData.insuredTypes);
  };
  document.getElementById('cmpManualInputBg').style.display    = 'block';
  document.getElementById('cmpManualInputPanel').style.display = 'block';
  // 確認鈕換成只改保額的邏輯
  document.querySelector('#cmpManualInputPanel button:first-of-type').onclick = function() {
    var amt = document.getElementById('cmpManualAmtInput').value.trim();
    if (amt) {
      _cmpManualAmounts[_cmpAmountEditKey] = _cmpFmtAmount(amt);
    } else {
      delete _cmpManualAmounts[_cmpAmountEditKey];
    }
    _cmpCloseManalInput();
    _cmpRenderMatrix(_cmpCurrentData.insuredTypes);
    _cmpToast(amt ? '✓ 保額已修改為 ' + _cmpFmtAmount(amt) : '✓ 已恢復系統保額');
  };
  setTimeout(function(){ document.getElementById('cmpManualAmtInput').focus(); }, 150);
}

// ── 數字解析（供最大值比較）──
function _cmpParseAmount(val) {
  if (!val) return 0;
  var s = String(val).replace(/,/g,'').trim();
  if (s.includes('億')) return parseFloat(s) * 100000000;
  if (s.includes('萬')) return parseFloat(s) * 10000;
  return parseFloat(s) || 0;
}

var _cmpManualInputKey = '';

function _cmpOpenManualInput(key) {
  _cmpManualInputKey = key;
  var isMarked = !!_cmpManualCells[key];
  var curAmt   = _cmpManualAmounts[key] || '';

  document.getElementById('cmpManualInputTitle').textContent =
    isMarked ? '✏️ 修改保額（空白表示不顯示）' : '✏️ 勾選並輸入保額（可空白）';
  document.getElementById('cmpManualAmtInput').value = curAmt;

  // 取消按鈕：若已勾選才顯示「取消勾選」
  var cancelBtn = document.getElementById('cmpManualCancelBtn');
  cancelBtn.textContent = isMarked ? '取消勾選' : '關閉';
  cancelBtn.style.background = isMarked ? '#FFEBEE' : '#F5F5F5';
  cancelBtn.style.color      = isMarked ? '#C62828' : '#666';

  document.getElementById('cmpManualInputBg').style.display    = 'block';
  document.getElementById('cmpManualInputPanel').style.display = 'block';
  setTimeout(function(){ document.getElementById('cmpManualAmtInput').focus(); }, 150);
}

function _cmpConfirmManualInput() {
  var key = _cmpManualInputKey;
  var amt = document.getElementById('cmpManualAmtInput').value.trim();
  _cmpManualCells[key]   = true;
  _cmpManualAmounts[key] = _cmpFmtAmount(amt);
  _cmpCloseManalInput();
  _cmpRenderMatrix(_cmpCurrentData.insuredTypes);
  _cmpToast('✓ 已手動標記' + (amt ? '　' + _cmpFmtAmount(amt) : ''));
}

function _cmpCancelManualMark() {
  var key     = _cmpManualInputKey;
  var isMarked = !!_cmpManualCells[key];
  if (isMarked) {
    // 取消勾選
    delete _cmpManualCells[key];
    delete _cmpManualAmounts[key];
    _cmpRenderMatrix(_cmpCurrentData.insuredTypes);
    _cmpToast('已取消標記');
  }
  _cmpCloseManalInput();
}

function _cmpCloseManalInput() {
  document.getElementById('cmpManualInputPanel').style.display = 'none';
  document.getElementById('cmpManualInputBg').style.display    = 'none';
}

// （保留舊名供 toggle 型格子直接取消用）
function _cmpToggleCell(key) {
  if (_cmpManualCells[key]) {
    delete _cmpManualCells[key];
    delete _cmpManualAmounts[key];
    _cmpRenderMatrix(_cmpCurrentData.insuredTypes);
    _cmpToast('已取消標記');
  } else {
    _cmpOpenManualInput(key);
  }
}
function _cmpToggleAddon(label) {
  _cmpManualAddons[label] = !_cmpManualAddons[label];
  _cmpRenderAddons(_cmpCurrentData.insuredTypes);
  _cmpToast(_cmpManualAddons[label] ? '✓ 已手動標記' : '已取消標記');
}
function resetManualCells() {
  _cmpManualCells   = {};
  _cmpManualAddons  = {};
  _cmpManualAmounts = {};
  _cmpRenderMatrix(_cmpCurrentData.insuredTypes);
  _cmpRenderAddons(_cmpCurrentData.insuredTypes);
  _cmpToast('已重設所有手動標記');
}

// ── 截圖下載 ──
function downloadCarMapCard() {
  html2canvas(document.getElementById('carMapCard'), {
    scale:2, useCORS:true, backgroundColor:'#ffffff'
  }).then(function(canvas) {
    var plate = (document.getElementById('cmpPlate').textContent || 'carmap').replace(/[^A-Za-z0-9\u4e00-\u9fa5\-]/g,'');
    var a = document.createElement('a');
    a.download = '車險保障_' + plate + '.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
    _cmpToast('📥 圖片已下載！');
  });
}

// ── LINE 分享 ──
function shareCarMapLine() {
  html2canvas(document.getElementById('carMapCard'), {
    scale:2, useCORS:true, backgroundColor:'#ffffff'
  }).then(function(canvas) {
    canvas.toBlob(function(blob) {
      if (navigator.clipboard && window.ClipboardItem) {
        navigator.clipboard.write([new ClipboardItem({'image/png': blob})])
          .then(function() {
            _cmpToast('✅ 圖片已複製！正在開啟 LINE…');
            setTimeout(function(){ window.location.href = 'line://'; }, 800);
          })
          .catch(function() { _cmpFallbackLine(canvas); });
      } else {
        _cmpFallbackLine(canvas);
      }
    });
  });
}
function _cmpFallbackLine(canvas) {
  var a = document.createElement('a');
  a.download = '車險保障圖卡.png';
  a.href = canvas.toDataURL('image/png');
  a.click();
  setTimeout(function(){ window.location.href = 'line://'; }, 600);
  _cmpToast('📥 圖片已下載，請手動傳入 LINE');
}

// ── 工具 ──
// ── 手動輸入到期日 ──
var _cmpEditType = '';  // 記錄目前編輯的是哪個欄位

function _cmpEditExpiry(type) {
  _cmpEditType = type;
  var valEl = document.getElementById(type === 'compulsory' ? 'cmpExpiry' : 'cmpVoluntaryExpiry');
  var cur   = valEl ? valEl.textContent : '';
  var title = type === 'compulsory' ? '🔵 輸入強制險到期日' : '🟢 輸入任意險到期日';

  document.getElementById('cmpEditPanelTitle').textContent = title;
  var input = document.getElementById('cmpExpiryEditInput');
  input.value = (cur && cur.indexOf('點擊') === -1 && cur !== '—') ? cur : '';

  document.getElementById('cmpExpiryEditBg').style.display    = 'block';
  document.getElementById('cmpExpiryEditPanel').style.display = 'block';
  setTimeout(function(){ input.focus(); }, 150);
}

function _cmpConfirmExpiry() {
  var val   = document.getElementById('cmpExpiryEditInput').value.trim();
  var type  = _cmpEditType;
  if (val) {
    var valEl = document.getElementById(type === 'compulsory' ? 'cmpExpiry' : 'cmpVoluntaryExpiry');
    if (type === 'compulsory') _cmpCurrentData.expiry         = val;
    else                       _cmpCurrentData.voluntaryExpiry = val;
    if (valEl) {
      valEl.textContent = val;
      valEl.className   = 'card-expiry-val' + (_cmpIsExpiringSoon(val) ? ' expiring' : '');
    }
  }
  _cmpCancelExpiry();
}

function _cmpCancelExpiry() {
  document.getElementById('cmpExpiryEditPanel').style.display = 'none';
  document.getElementById('cmpExpiryEditBg').style.display    = 'none';
}

function _cmpIsExpiringSoon(expiry) {
  if (!expiry) return false;
  try {
    var str = String(expiry);
    // 民國年轉換（例：114/8/15）
    if (/^\d{3}\//.test(str)) {
      var p = str.split('/');
      str = (parseInt(p[0])+1911) + '-' + p[1] + '-' + p[2];
    }
    var d = new Date(str);
    if (isNaN(d)) return false;
    return Math.ceil((d - new Date()) / (1000*60*60*24)) <= 30;
  } catch(e) { return false; }
}
function _cmpToast(msg) {
  var t = document.getElementById('cmpToast');
  t.textContent = msg;
  t.style.display = 'block';
  clearTimeout(t._t);
  t._t = setTimeout(function(){ t.style.display='none'; }, 2000);
}

// ══════════════════════════════════════════════════════
// ★ 把 index.html 內 onclick="..." 會呼叫到的函式 expose 到全域
//   （沿用你原本 v6.6 在 line 5359 的作法：ES Module 預設不會把函式
//    掛在 window 上，HTML inline onclick 只認得到 window 上的名字，
//    所以這裡要手動接上橋）
// ══════════════════════════════════════════════════════
window.openCarMapFromModal   = openCarMapFromModal;
window.closeCarMapPanel      = closeCarMapPanel;
window.downloadCarMapCard    = downloadCarMapCard;
window.shareCarMapLine       = shareCarMapLine;
window.resetManualCells      = resetManualCells;
window._cmpEditExpiry        = _cmpEditExpiry;
window._cmpConfirmExpiry     = _cmpConfirmExpiry;
window._cmpCancelExpiry      = _cmpCancelExpiry;
window._cmpOpenManualInput   = _cmpOpenManualInput;
window._cmpOpenAmountEdit    = _cmpOpenAmountEdit;
window._cmpConfirmManualInput = _cmpConfirmManualInput;
window._cmpCancelManualMark  = _cmpCancelManualMark;
window._cmpCloseManalInput   = _cmpCloseManalInput;
window._cmpToggleCell        = _cmpToggleCell;
