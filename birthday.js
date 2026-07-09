// ══════════════════════════════════════════════════════
// birthday.js — 生日祝福系統（ES Module）
// 原本位於 index.html 第 3835–4457 行，拆分示範
// 依賴（來自尚未拆分的其他區塊，皆為全域變數/函式，載入順序已確保先於本模組執行）：
//   gasCall, directGasCall, _directShellUrl, renderModal（定義於尚未拆分的 modal 區塊）
// 本模組的 showBdToast 是全站共用的提示訊息函式，
// 已拆出的 lock.js、family-report.js 都會呼叫它，所以務必 expose 到全域
// ══════════════════════════════════════════════════════

    // ══════════════════════════════════════════════════════
  // ★ 生日祝福系統
  // ══════════════════════════════════════════════════════

  var _birthdayCache     = [];   // 今日生日快取
  var _birthdaySentSet   = {};   // 已發送記錄（localStorage）
  var _birthdayPanelOpen = false;

  // 讀取/儲存已發送記錄（存在 localStorage，以日期為 key）
  function _bdSentKey() {
    var d = new Date();
    return 'bdSent_' + d.getFullYear() + '_' + (d.getMonth()+1) + '_' + d.getDate();
  }
  function _bdLoadSent() {
    try { _birthdaySentSet = JSON.parse(localStorage.getItem(_bdSentKey()) || '{}'); } catch(e) { _birthdaySentSet = {}; }
  }
  function _bdMarkSent(id) {
    _bdLoadSent();
    _birthdaySentSet[id] = true;
    try { localStorage.setItem(_bdSentKey(), JSON.stringify(_birthdaySentSet)); } catch(e) {}
  }
  function _bdIsSent(id) { _bdLoadSent(); return !!_birthdaySentSet[id]; }

  // 載入今日生日
  function loadTodayBirthdays() {
    var fn = function(result) {
      if (!result || !result.list || result.list.length === 0) return;
      _birthdayCache = result.list;
      renderBirthdayBanner(result.list);
    };
    if (_directShellUrl) {
      directGasCall('getTodayBirthdays', {}, fn, function(){});
    } else {
      gasCall('getTodayBirthdays', {}, fn, function(){});
    }
  }

  // 首頁橘色橫幅
  function renderBirthdayBanner(list) {
    var area = document.getElementById('birthdayBannerArea');
    if (!area || !list || list.length === 0) return;
    var sentCount    = list.filter(function(p){ return _bdIsSent(p.id+'_'+p.birthMonth+'_'+p.birthDay); }).length;
    var pendingCount = list.length - sentCount;
    area.innerHTML =
      '<div onclick="toggleBirthdayPanel()" style="' +
        'background:linear-gradient(135deg,#FF6B6B,#FF8E53);' +
        'border-radius:var(--radius-md);padding:13px 16px;margin-bottom:8px;' +
        'display:flex;align-items:center;justify-content:space-between;' +
        'cursor:pointer;box-shadow:0 3px 10px rgba(255,107,107,0.3);">' +
        '<div style="display:flex;align-items:center;gap:12px;">' +
          '<span style="font-size:26px;">🎂</span>' +
          '<div>' +
            '<div style="color:white;font-size:14px;font-weight:700;">今日生日客戶</div>' +
            '<div style="color:rgba(255,255,255,0.85);font-size:11px;margin-top:2px;">' +
              (pendingCount > 0 ? '待發送 '+pendingCount+' 位' : '✅ 全部已發送') +
              (sentCount > 0 ? '　已發 '+sentCount+' 位' : '') +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div style="background:var(--surface);color:#FF6B6B;font-size:20px;font-weight:900;' +
          'width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;">' +
          list.length +
        '</div>' +
      '</div>' +
      '<div id="birthdayPanelArea" style="display:none;"></div>';
  }

  function toggleBirthdayPanel() {
    var area = document.getElementById('birthdayPanelArea');
    if (!area) return;
    if (area.style.display === 'none') {
      area.style.display = 'block';
      renderBirthdayList(_birthdayCache, area);
    } else {
      area.style.display = 'none';
    }
  }

  // 今日生日名單
  function renderBirthdayList(list, container) {
    if (!list || list.length === 0) { container.innerHTML = ''; return; }
    var html = '';
    list.forEach(function(p) {
      var sent    = _bdIsSent(p.id+'_'+p.birthMonth+'_'+p.birthDay);
      var safeName= p.name.replace(/'/g,"'");
      var safeId  = (p.id||'').replace(/'/g,"'");
      var safePhone=(p.phone||'').replace(/[-\s]/g,'');
      var safeType= (p.insType||'').replace(/'/g,"'");
      var safeKey = (p.id+'_'+p.birthMonth+'_'+p.birthDay).replace(/'/g,"'");

      html +=
        '<div style="background:var(--surface);border-radius:var(--radius-md);padding:13px 15px;margin-bottom:8px;' +
          'box-shadow:0 2px 8px rgba(0,0,0,0.07);border-left:4px solid ' + (sent?'#4CAF50':'#FF6B6B') + ';' +
          (sent?'opacity:0.7':'') + '">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">' +
            '<div style="font-size:16px;font-weight:700;">' + p.name +
              (p.agentCode && p.agentCode!=='無' ? ' <span style="color:#FF9800;font-size:12px;">['+p.agentCode+']</span>' : '') +
            '</div>' +
            '<div style="background:' + (sent?'#E8F5E9':'#FFF0F0') + ';color:' + (sent?'#2E7D32':'#FF6B6B') + ';' +
              'font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;">' +
              (sent ? '✅ 已發送' : '🎂 '+p.age+' 歲') +
            '</div>' +
          '</div>' +
          '<div style="font-size:12px;color:#777;margin-bottom:8px;display:flex;gap:10px;flex-wrap:wrap;">' +
            (p.phone ? '<span>📞 '+p.phone+'</span>' : '') +
            '<span>📋 '+p.insType+'</span>' +
            (p.relation && p.relation!=='本人' ? '<span>👤 '+p.relation+'</span>' : '') +
          '</div>' +
          '<div style="display:flex;gap:6px;">' +
          '<div style="display:flex;gap:6px;flex-wrap:wrap;">' +
            '<button onclick="openBirthdayGreeting(\''+safeName+'\',\''+safeId+'\',\''+safePhone+'\',\''+safeType+'\',\''+safeKey+'\')" ' +
              'style="flex:2;min-width:100px;padding:9px;background:linear-gradient(135deg,#667eea,#764ba2);color:white;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;">' +
              (sent ? '🔄 重新發送' : '✨ 生成祝福語') + '</button>' +
            '<button onclick="openBdPolicySummary(\''+safeId+'\',\''+safeName+'\')" ' +
              'style="flex:1;min-width:55px;padding:9px;background:var(--primary);color:white;border:none;border-radius:var(--radius-sm);font-size:12px;font-weight:700;cursor:pointer;">📋 保單</button>' +
            (sent ? '' : '<button onclick="markBirthdaySent(\''+safeKey+'\')" ' +
              'style="flex:1;min-width:50px;padding:9px;background:#F5F5F5;color:var(--text3);border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;">✓ 已發</button>') +
          '</div>' +
        '</div>';
    });
    container.innerHTML = html;
  }

  function markBirthdaySent(key) {
    _bdMarkSent(key);
    renderBirthdayBanner(_birthdayCache);
    var area = document.getElementById('birthdayPanelArea');
    if (area && area.style.display !== 'none') {
      renderBirthdayList(_birthdayCache, area);
    }
  }

  // ── 生日祝福面板（AI 生成 + 711 + LINE）──
  var _bdCurrentStyle    = 'warm';
  var _bdCurrentSalute   = '';
  var _bdCurrentName     = '';
  var _bdCurrentKey      = '';
  var _bdCurrentPhone    = '';
  var _bdCurrentGenCount = 0;
  var _bdLastSummaryId   = '';  // 記住最後查詢的身分證
  var _bdLastSummaryName = '';  // 記住最後查詢的姓名

  var _bdMsgTemplates = {
    warm: [
      '{salute}，今天是您的生日！🎉\n感謝這些年來的信任與支持，\n願您生日快樂、平安順遂，\n出行平安、諸事順心！🎊\n\n✨ 願未來的每一天，都有平安與幸福相伴。\n\n— {advisor} 敬上',
      '{salute}，生日快樂！🎂\n與您相識多年，感謝您的信任，\n願新的一歲健康快樂、萬事如意！\n希望每天出門都平平安安回家！🏠\n\n✨ 小小心意送上最真摯的祝福，願您歲歲平安。\n\n— {advisor} 敬上',
      '{salute}，祝您生日快樂！🎉\n感謝長期的支持與厚愛，\n願這一年事業順遂、身體健康，\n幸福美滿每一天！✨\n\n🍀 感謝有您相伴，由衷祝您心想事成！\n\n— {advisor} 敬上'
    ],
    fun: [
      '{salute}，今天是您的大日子！🎂\n祝您生日快樂，越來越年輕！\n天天都有好心情，好運源源不絕！✨\n\n— {advisor}',
      '{salute}，聽說今天是您的生日？🎉\n這麼重要的日子一定要開心慶祝！\n送上滿滿的祝福，希望每天都這麼開心！❤️\n\n— {advisor}',
      '{salute} 生日快樂！🥳\n又精彩了一歲呢～越來越有智慧！\n保持年輕活力，繼續帥氣/美麗一整年！🚀\n\n— {advisor}'
    ],
    short: [
      '{salute} 生日快樂！🎂\n感謝您的支持，祝您新的一歲平安健康、萬事如意！\n\n— {advisor}',
      '{salute}，生日快樂！🎉\n願您健康平安、順心如意！\n送上最誠摯的祝福 ✨ — {advisor}',
      '{salute} 生日快樂！🎂 感謝長期支持！\n祝您心想事成，出入平安，諸事順利！🌟 — {advisor}'
    ]
  };
  var _bdCurrentMsgIdx = 0;

  function openBirthdayGreeting(name, id, phone, insType, key) {
    _bdCurrentName  = name;
    _bdCurrentKey   = key;
    _bdCurrentPhone = phone;
    _bdCurrentStyle = 'warm';
    _bdCurrentMsgIdx = 0;
    _bdCurrentGenCount = 0;

    // 自動產生稱呼建議
    var suggestions = _genSaluteSuggestions(name);
    _bdCurrentSalute = suggestions[0] || name;

    var ovId = 'bdGreetingOverlay';
    var ex = document.getElementById(ovId); if (ex) document.body.removeChild(ex);
    var ov = document.createElement('div');
    ov.id  = ovId;
    ov.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:9000;overflow-y:auto;padding:16px;box-sizing:border-box;';

    var saluteChips = suggestions.map(function(s) {
      return '<button onclick="setBdSalute(this,\''+s+'\')" data-salute="'+s+'" ' +
        'style="padding:6px 14px;border-radius:20px;border:1.5px solid '+(s===_bdCurrentSalute?'#667eea':'#DDD')+';' +
        'background:'+(s===_bdCurrentSalute?'#EDE7F6':'#F9F9F9')+';color:'+(s===_bdCurrentSalute?'#5C35B4':'#666')+';' +
        'font-size:13px;cursor:pointer;font-weight:'+(s===_bdCurrentSalute?'700':'400')+';margin:0 4px 6px 0;">'+s+'</button>';
    }).join('');

    ov.innerHTML =
      '<div style="background:var(--surface);border-radius:16px;max-width:420px;margin:0 auto;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.2);">' +
        // 頭部
        '<div style="background:linear-gradient(135deg,#FF6B6B,#FF8E53);padding:16px;color:white;">' +
          '<div style="font-size:16px;font-weight:700;">🎂 生日祝福 — '+name+'</div>' +
          '<div style="font-size:12px;opacity:0.85;margin-top:3px;">選稱呼 → 選祝福語 → 送咖啡 → 傳 LINE</div>' +
        '</div>' +
        '<div style="padding:16px;">' +

          // 步驟一：稱呼
          '<div style="font-size:12px;font-weight:700;color:var(--text2);margin-bottom:8px;">① 稱呼方式</div>' +
          '<div id="bdSaluteChips" style="margin-bottom:6px;flex-wrap:wrap;display:flex;">' + saluteChips + '</div>' +
          '<input id="bdSaluteCustom" placeholder="自訂稱呼（如：峰哥、正峰大哥）" ' +
            'oninput="setBdSaluteCustom(this.value)" ' +
            'style="width:100%;box-sizing:border-box;padding:8px 12px;border:1.5px solid #E0E0E0;border-radius:8px;font-size:13px;margin-bottom:14px;outline:none;">' +

          // 步驟二：風格 + 祝福語
          '<div style="font-size:12px;font-weight:700;color:var(--text2);margin-bottom:8px;">② 祝福語風格</div>' +
          '<div style="display:flex;gap:6px;margin-bottom:10px;">' +
            '<button onclick="setBdStyle(this,\'warm\')" data-style="warm" ' +
              'style="flex:1;padding:8px;border-radius:8px;border:1.5px solid #FF6B6B;background:#FFF0F0;color:#C62828;font-size:12px;font-weight:700;cursor:pointer;">💝 溫馨</button>' +
            '<button onclick="setBdStyle(this,\'fun\')" data-style="fun" ' +
              'style="flex:1;padding:8px;border-radius:8px;border:1.5px solid #DDD;background:#F9F9F9;color:var(--text3);font-size:12px;font-weight:700;cursor:pointer;">😄 輕鬆</button>' +
            '<button onclick="setBdStyle(this,\'short\')" data-style="short" ' +
              'style="flex:1;padding:8px;border-radius:8px;border:1.5px solid #DDD;background:#F9F9F9;color:var(--text3);font-size:12px;font-weight:700;cursor:pointer;">✍️ 簡潔</button>' +
          '</div>' +
          '<div id="bdMsgBox" style="background:#F8F8FF;border:1.5px solid #E8E0FF;border-radius:var(--radius-md);padding:12px 14px;' +
            'font-size:13px;line-height:1.9;color:var(--text1);margin-bottom:8px;white-space:pre-line;min-height:100px;"></div>' +
          '<div style="display:flex;gap:6px;margin-bottom:14px;">' +
            '<button onclick="cycleBdMsg()" ' +
              'style="flex:1;padding:9px;background:#F5F5F5;color:var(--text2);border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;">🔄 換一則（'+_bdCurrentMsgIdx+'/3）</button>' +
          '</div>' +

          // 步驟三：711
          '<div style="background:#E8F5E9;border-radius:var(--radius-md);padding:12px 14px;margin-bottom:10px;">' +
            '<div style="font-size:12px;font-weight:700;color:#1B5E20;margin-bottom:10px;">③ ☕ 傳送 711 咖啡券</div>' +
            '<div style="display:flex;gap:8px;margin-bottom:8px;">' +
              '<button onclick="bdCopyPhone()" ' +
                'style="flex:1;padding:10px 6px;background:#1B5E20;color:white;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;">' +
                '📋 複製手機號碼<br><span style="font-size:11px;font-weight:400;opacity:0.9">' + (phone.replace(/(\d{4})(\d{3})(\d{3})/,'$1-$2-$3')||phone) + '</span></button>' +
              '<button onclick="bdOpen711()" ' +
                'style="flex:1;padding:10px 6px;background:#FF5722;color:white;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;">' +
                '🚀 開啟<br><span style="font-size:11px;font-weight:400;opacity:0.9">OPENPOINT APP</span></button>' +
            '</div>' +
            '<div style="font-size:11px;color:#388E3C;background:var(--surface);border-radius:8px;padding:8px 10px;line-height:1.7;">' +
              '路徑：<b>行動隨時取 → 提貨券 → 轉贈/兌換籃 → 轉贈給好友</b><br>→ 貼上手機號碼 → 選咖啡券 → 發送' +
            '</div>' +
          '</div>' +

          // 步驟四：LINE
          '<div style="background:#E3F2FD;border-radius:var(--radius-md);padding:12px 14px;margin-bottom:14px;">' +
            '<div style="font-size:12px;font-weight:700;color:#0D47A1;margin-bottom:10px;">④ 💬 傳送 LINE 祝福訊息</div>' +
            '<div style="display:flex;gap:8px;">' +
              '<button onclick="bdCopyMsg()" ' +
                'style="flex:1;padding:10px;background:var(--primary);color:white;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;">📋 複製祝福語</button>' +
              '<button onclick="bdOpenLine()" ' +
                'style="flex:1;padding:10px;background:#00B900;color:white;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;">💬 開啟 LINE</button>' +
            '</div>' +
          '</div>' +

          // 完成 + 關閉
          '<div style="display:flex;gap:8px;">' +
            '<button onclick="bdDone()" ' +
              'style="flex:2;padding:12px;background:#4CAF50;color:white;border:none;border-radius:var(--radius-md);font-size:14px;font-weight:700;cursor:pointer;">✅ 標記已發送完成</button>' +
            '<button onclick="closeBdOverlay()" ' +
              'style="flex:1;padding:12px;background:#F5F5F5;color:var(--text2);border:none;border-radius:var(--radius-md);font-size:14px;cursor:pointer;">關閉</button>' +
          '</div>' +

        '</div>' +
      '</div>';

    document.body.appendChild(ov);
    ov.addEventListener('click', function(e) { if (e.target===ov) closeBdOverlay(); });
    updateBdMsgBox();
  }

  function _genSaluteSuggestions(name) {
    if (!name) return [name];
    var s = [];
    // 去掉稱謂詞
    var clean = name.replace(/先生|女士|小姐|太太|老師|醫師|董事長|經理/g,'');
    var lastName = clean.length >= 2 ? clean.charAt(0) : '';
    var firstName = clean.length >= 2 ? clean.substring(1) : clean;
    if (firstName) s.push(firstName);             // 名字（去姓）
    s.push(clean);                                  // 全名
    if (lastName) s.push(lastName + '先生');        // 姓+先生
    if (lastName) s.push(lastName + '小姐');        // 姓+小姐
    return [...new Set(s)].filter(Boolean).slice(0,4);
  }

  function setBdSalute(btn, salute) {
    _bdCurrentSalute = salute;
    document.getElementById('bdSaluteCustom').value = '';
    document.querySelectorAll('#bdSaluteChips button').forEach(function(b) {
      var isActive = b.getAttribute('data-salute') === salute;
      b.style.borderColor = isActive ? '#667eea' : '#DDD';
      b.style.background  = isActive ? '#EDE7F6' : '#F9F9F9';
      b.style.color       = isActive ? '#5C35B4' : '#666';
      b.style.fontWeight  = isActive ? '700' : '400';
    });
    updateBdMsgBox();
  }

  function setBdSaluteCustom(val) {
    if (!val) return;
    _bdCurrentSalute = val;
    document.querySelectorAll('#bdSaluteChips button').forEach(function(b) {
      b.style.borderColor = '#DDD'; b.style.background='#F9F9F9'; b.style.color='#666'; b.style.fontWeight='400';
    });
    updateBdMsgBox();
  }

  function setBdStyle(btn, style) {
    _bdCurrentStyle  = style;
    _bdCurrentMsgIdx = 0;
    document.querySelectorAll('[data-style]').forEach(function(b) {
      var isActive = b.getAttribute('data-style') === style;
      b.style.borderColor = isActive ? '#FF6B6B' : '#DDD';
      b.style.background  = isActive ? '#FFF0F0' : '#F9F9F9';
      b.style.color       = isActive ? '#C62828' : '#888';
    });
    updateBdMsgBox();
  }

  function cycleBdMsg() {
    var msgs = _bdMsgTemplates[_bdCurrentStyle] || _bdMsgTemplates['warm'];
    _bdCurrentMsgIdx = (_bdCurrentMsgIdx + 1) % msgs.length;
    updateBdMsgBox();
  }

  function updateBdMsgBox() {
    var msgs = _bdMsgTemplates[_bdCurrentStyle] || _bdMsgTemplates['warm'];
    var msg  = msgs[_bdCurrentMsgIdx] || msgs[0];
    msg = msg.replace(/\{salute\}/g, _bdCurrentSalute || _bdCurrentName);
    msg = msg.replace(/\{advisor\}/g, ADVISOR_NAME || '您的保險顧問');
    var box = document.getElementById('bdMsgBox');
    if (box) box.textContent = msg;
    // 更新換一則按鈕
    var cycleBtn = document.querySelector('#bdGreetingOverlay button[onclick="cycleBdMsg()"]');
    if (cycleBtn) cycleBtn.textContent = '🔄 換一則（'+(_bdCurrentMsgIdx+1)+'/'+msgs.length+'）';
  }

  function bdCopyPhone() {
    var phone = _bdCurrentPhone.replace(/[-\s]/g,'');
    if (navigator.clipboard) navigator.clipboard.writeText(phone);
    try { document.execCommand && (function(){var t=document.createElement('textarea');t.value=phone;document.body.appendChild(t);t.select();document.execCommand('copy');document.body.removeChild(t);})(); } catch(e){}
    showBdToast('📋 已複製：' + _bdCurrentPhone);
  }

  function bdOpen711() {
    showBdToast('🚀 開啟 OPENPOINT...');
    setTimeout(function(){ window.location.href='openpoint://'; }, 200);
  }

  function bdCopyMsg() {
    var msgs = _bdMsgTemplates[_bdCurrentStyle] || _bdMsgTemplates['warm'];
    var msg  = (msgs[_bdCurrentMsgIdx]||msgs[0]).replace(/\{salute\}/g,_bdCurrentSalute||_bdCurrentName).replace(/\{advisor\}/g,ADVISOR_NAME||'您的保險顧問');
    if (navigator.clipboard) navigator.clipboard.writeText(msg);
    try { document.execCommand && (function(){var t=document.createElement('textarea');t.value=msg;document.body.appendChild(t);t.select();document.execCommand('copy');document.body.removeChild(t);})(); } catch(e){}
    showBdToast('📋 祝福語已複製，請貼到 LINE！');
  }

  function bdOpenLine() {
    showBdToast('💬 開啟 LINE...');
    setTimeout(function(){ window.location.href='line://'; }, 200);
  }

  function bdDone() {
    _bdMarkSent(_bdCurrentKey);
    showBdToast('✅ 已標記發送完成！');
    setTimeout(function() {
      closeBdOverlay();
      renderBirthdayBanner(_birthdayCache);
      var area = document.getElementById('birthdayPanelArea');
      if (area && area.style.display !== 'none') renderBirthdayList(_birthdayCache, area);
    }, 800);
  }

  // ── 客戶保障摘要（從生日名單開啟，用身分證查所有保單）──
  function openBdPolicySummary(insuredId, name) {
    _bdLastSummaryId   = insuredId || '';
    _bdLastSummaryName = name || '';
    document.getElementById('loading').style.display = 'block';

    // 優先用身分證查，若無結果改用姓名查
    var searchKey = (insuredId && insuredId !== '無' && insuredId.length > 3) ? insuredId : name;

    var fn = function(results) {
      document.getElementById('loading').style.display = 'none';
      if (!results || results.length === 0) {
        // 身分證找不到 → 改用姓名再找一次
        if (searchKey !== name) {
          document.getElementById('loading').style.display = 'block';
          var params2 = { q: name, showAll: true };
          var fn2 = function(r2) {
            document.getElementById('loading').style.display = 'none';
            if (!r2 || r2.length === 0) {
              alert('查無 ' + name + ' 的保單資料'); return;
            }
            _showBdPolicySummaryOverlay(name, r2);
          };
          if (_directShellUrl) directGasCall('searchPolicies', params2, fn2, function(){ document.getElementById('loading').style.display='none'; alert('查詢失敗'); });
          else gasCall('searchPolicies', params2, fn2, function(){ document.getElementById('loading').style.display='none'; alert('查詢失敗'); });
          return;
        }
        alert('查無 ' + name + ' 的保單資料'); return;
      }
      _showBdPolicySummaryOverlay(name, results);
    };
    var failFn = function() {
      document.getElementById('loading').style.display = 'none';
      alert('查詢失敗，請稍後再試');
    };
    var params = { q: searchKey, showAll: true };
    if (_directShellUrl) directGasCall('searchPolicies', params, fn, failFn);
    else gasCall('searchPolicies', params, fn, failFn);
  }

  function _showBdPolicySummaryOverlay(name, policies) {
    var ovId = 'bdSummaryOverlay';
    var ex   = document.getElementById(ovId); if (ex) document.body.removeChild(ex);
    var ov   = document.createElement('div');
    ov.id    = ovId;
    ov.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:9100;overflow-y:auto;padding:16px;box-sizing:border-box;';

    // 依險種分類
    var car     = policies.filter(function(p){ return p.type && (p.type.includes('汽車')||p.type.includes('機車')); });
    var health  = policies.filter(function(p){ return p.type && (p.type.includes('健康')||p.type.includes('傷害')); });
    var fire    = policies.filter(function(p){ return p.type && (p.type.includes('火險')||p.type.includes('住宅')); });
    var travel  = policies.filter(function(p){ return p.type && (p.type.includes('旅平')||p.type.includes('新種')); });
    var other   = policies.filter(function(p){
      return !car.includes(p)&&!health.includes(p)&&!fire.includes(p)&&!travel.includes(p);
    });

    function renderGroup(title, emoji, color, group) {
      if (!group.length) return '';
      var h = '<div style="margin-bottom:12px;">' +
        '<div style="font-size:12px;font-weight:700;color:'+color+';margin-bottom:6px;">'+emoji+' '+title+'（'+group.length+'張）</div>';
      group.forEach(function(p) {
        var safePno = (p.policyNo||'').replace(/'/g,"'");
        var today   = new Date(); today.setHours(0,0,0,0);
        var expDate = p.expiry ? robustExpiry(p.expiry) : null;
        var daysLeft= expDate ? Math.ceil((expDate-today)/86400000) : null;
        var expColor= daysLeft===null?'#999':daysLeft<0?'#d32f2f':daysLeft<=30?'#F57F17':'#2E7D32';
        var statusTag = (p.renewStatus==='已報廢'||p.renewStatus==='已過戶') ?
          ' <span style="background:#BDBDBD;color:#fff;font-size:10px;padding:1px 6px;border-radius:8px;">'+p.renewStatus+'</span>' : '';

        h += '<div style="background:var(--surface);border-radius:8px;padding:10px 12px;margin-bottom:6px;' +
          'border:1px solid #E8E8E8;box-shadow:0 1px 4px rgba(0,0,0,0.05);">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">' +
            '<div style="font-size:13px;font-weight:700;color:var(--text1);">'+p.type+statusTag+'</div>' +
            '<div style="font-size:12px;font-weight:700;color:'+expColor+';">' +
              (daysLeft===null?'—':daysLeft<0?'已到期 '+Math.abs(daysLeft)+'天':daysLeft===0?'今日到期':'剩 '+daysLeft+' 天') +
            '</div>' +
          '</div>' +
          '<div style="font-size:11px;color:var(--text3);margin-bottom:6px;">'+
            '到期：'+(p.expiry||'—')+'　保單：'+p.policyNo +
            (p.plateNo&&p.plateNo!=='無'?'　🚗 '+p.plateNo:'') +
          '</div>' +
          '<button onclick="openDetailFromSummary(\''+safePno+'\')" ' +
            'style="width:100%;padding:7px;background:#E8F4FD;color:#00A3C4;border:1px solid #BAE6FD;' +
            'border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;">🔍 查看保單明細</button>' +
        '</div>';
      });
      return h + '</div>';
    }

    var html =
      '<div style="background:var(--surface);border-radius:16px;max-width:420px;margin:0 auto;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.2);">' +
        '<div style="background:linear-gradient(135deg,#00A3C4,#0369a1);padding:16px;color:white;">' +
          '<div style="font-size:16px;font-weight:700;">📋 ' + name + ' 的保障摘要</div>' +
          '<div style="font-size:12px;opacity:0.85;margin-top:3px;">共 '+policies.length+' 張保單　點擊各保單可查看明細</div>' +
        '</div>' +
        '<div style="padding:16px;">' +
          renderGroup('車險', '🚗', '#E65100', car) +
          renderGroup('健康傷害險', '🏥', '#1565C0', health) +
          renderGroup('住宅火險', '🏠', '#E65100', fire) +
          renderGroup('旅平險/新種險', '✈️', '#6A1B9A', travel) +
          renderGroup('其他', '📋', '#555', other) +
          '<button onclick="document.body.removeChild(document.getElementById(\'bdSummaryOverlay\'))" ' +
            'style="width:100%;padding:12px;background:#F5F5F5;color:var(--text2);border:none;border-radius:var(--radius-md);font-size:14px;cursor:pointer;margin-top:4px;">關閉</button>' +
        '</div>' +
      '</div>';

    ov.innerHTML = html;
    document.body.appendChild(ov);
    ov.addEventListener('click', function(e) { if (e.target===ov) document.body.removeChild(ov); });
  }

  // 從摘要面板查看單張明細
  function openDetailFromSummary(policyNo) {
    // 先關閉摘要面板，避免被蓋住
    var summaryOv = document.getElementById('bdSummaryOverlay');
    if (summaryOv) document.body.removeChild(summaryOv);

    document.getElementById('loading').style.display = 'block';
    var failFn = function() {
      document.getElementById('loading').style.display = 'none';
      alert('讀取保單詳情失敗');
    };
    var successFn = function(data) {
      renderModal(data);
      // 在明細右上角加「返回保障摘要」按鈕
      setTimeout(function() {
        var modal = document.getElementById('policyModal');
        if (!modal) return;
        // 避免重複插入
        if (modal.querySelector('#backToSummaryBtn')) return;
        var backBtn = document.createElement('button');
        backBtn.id = 'backToSummaryBtn';
        backBtn.textContent = '← 返回保障摘要';
        backBtn.style.cssText = 'position:sticky;top:0;width:100%;padding:10px;background:#E3F2FD;color:#00A3C4;border:none;font-size:13px;font-weight:700;cursor:pointer;z-index:10;margin-bottom:8px;';
        backBtn.onclick = function() {
          // 關閉明細 overlay，重新顯示保障摘要
          var detailOv = document.getElementById('policyModalOverlay') || modal.parentElement;
          if (detailOv) document.body.removeChild(detailOv);
          if (_bdLastSummaryName && _bdLastSummaryId) {
            openBdPolicySummary(_bdLastSummaryId, _bdLastSummaryName);
          }
        };
        modal.insertBefore(backBtn, modal.firstChild);
      }, 100);
    };
    if (_directShellUrl) directGasCall('getPolicyDetails', { no: policyNo }, successFn, failFn);
    else gasCall('getPolicyDetails', { no: policyNo }, successFn, failFn);
  }

  // 計算到期日（支援民國年）
  function robustExpiry(str) {
    if (!str||str==='無'||str==='—') return null;
    var s = String(str).trim();
    var m = s.match(/^(\d{2,3})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (m) {
      var y=parseInt(m[1]); if(y<200) y+=1911;
      return new Date(y, parseInt(m[2])-1, parseInt(m[3]));
    }
    var d = new Date(s); return isNaN(d.getTime()) ? null : d;
  }

    function closeBdOverlay() {
    var ov = document.getElementById('bdGreetingOverlay');
    if (ov) document.body.removeChild(ov);
  }

  function showBdToast(msg) {
    var t = document.getElementById('toast');
    if (!t) { t = document.createElement('div'); t.id='toast';
      t.style.cssText='position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#333;color:white;padding:10px 20px;border-radius:20px;font-size:13px;font-weight:700;z-index:99999;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.3);';
      document.body.appendChild(t); }
    t.textContent = msg; t.style.display='block';
    clearTimeout(t._timer);
    t._timer = setTimeout(function(){ t.style.display='none'; }, 2500);
  }

  // ── 本月生日查詢（12宮格）──
  function loadBirthdayMonthSummary() {
    var fn = function(result) {
      if (!result || !result.counts) return;
      renderBirthdayMonthGrid(result.counts);
    };
    if (_directShellUrl) directGasCall('getBirthdayMonthSummary', {}, fn, function(){});
    else gasCall('getBirthdayMonthSummary', {}, fn, function(){});
  }

  function renderBirthdayMonthGrid(counts) {
    var today = new Date();
    var curM  = today.getMonth(); // 0-based
    var area  = document.getElementById('resultsList');
    if (!area) return;
    var html =
      '<div style="background:var(--surface);border-radius:var(--radius-md);padding:14px 16px;margin-bottom:10px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">' +
        '<div style="font-size:14px;font-weight:700;color:var(--text1);margin-bottom:12px;">📅 各月生日人數</div>' +
        '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;">';
    var mNames = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
    counts.forEach(function(cnt, i) {
      var isCur = (i === curM);
      var hasPpl= cnt > 0;
      html +=
        '<div onclick="loadBirthdayByMonth('+(i+1)+')" style="cursor:pointer;padding:10px 6px;border-radius:var(--radius-md);text-align:center;' +
          'border:1.5px solid '+(isCur?'#FF6B6B':hasPpl?'#FF8E53':'#E0E0E0')+';' +
          'background:'+(isCur?'#FFF0F0':hasPpl?'#FFF8F0':'#F9F9F9')+';' +
          'transition:all 0.15s;">' +
          '<div style="font-size:13px;font-weight:700;color:'+(isCur?'#C62828':hasPpl?'#E65100':'#999')+'">' + mNames[i] + (isCur?' ◀':'') + '</div>' +
          '<div style="font-size:20px;font-weight:900;color:'+(hasPpl?'#FF6B6B':'#CCC')+';margin:2px 0;">' + cnt + '</div>' +
          '<div style="font-size:10px;color:#AAA">人</div>' +
        '</div>';
    });
    html += '</div></div>';
    area.innerHTML = html;
  }

  function loadBirthdayByMonth(month) {
    document.getElementById('loading').style.display = 'block';
    var fn = function(result) {
      document.getElementById('loading').style.display = 'none';
      var area = document.getElementById('resultsList');
      if (!result || !result.list || result.list.length === 0) {
        area.innerHTML = '<p style="text-align:center;color:var(--text3);">本月無生日客戶</p>';
        loadBirthdayMonthSummary(); return;
      }
      var mNames = ['','一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
      var html = '<div style="background:#FFF0F0;border-radius:var(--radius-md);padding:12px 14px;margin-bottom:10px;">' +
        '<div style="color:#C62828;font-weight:700;">🎂 '+mNames[month]+'生日名單：共 '+result.total+' 人</div>' +
        '</div>';
      result.list.forEach(function(p) {
        var safeName= p.name.replace(/'/g,"'");
        var safeId  = (p.id||'').replace(/'/g,"'");
        var safePhone=(p.phone||'').replace(/[-\s]/g,'');
        var safeType=(p.insType||'').replace(/'/g,"'");
        var safeKey=(p.id+'_'+p.birthMonth+'_'+p.birthDay).replace(/'/g,"'");
        html +=
          '<div style="background:var(--surface);border-radius:var(--radius-md);padding:12px 14px;margin-bottom:8px;' +
            'box-shadow:0 2px 6px rgba(0,0,0,0.06);border-left:4px solid #FF8E53;">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">' +
              '<div style="font-weight:700;font-size:15px;">' + p.name +
                (p.agentCode&&p.agentCode!=='無'?' <span style="color:#FF9800;font-size:12px;">['+p.agentCode+']</span>':'') +
              '</div>' +
              '<div style="font-size:12px;color:#FF6B6B;font-weight:700;">' + p.birthMonth+'/'+p.birthDay + ' 🎂 '+p.age+'歲</div>' +
            '</div>' +
            '<div style="font-size:12px;color:#777;margin-bottom:8px;">' +
              (p.phone?'📞 '+p.phone+'　':'') + '📋 '+p.insType +
            '</div>' +
            '<div style="display:flex;gap:6px;">' +
              '<button onclick="openBirthdayGreeting(\''+safeName+'\',\''+safeId+'\',\''+safePhone+'\',\''+safeType+'\',\''+safeKey+'\')" ' +
                'style="flex:2;padding:9px;background:linear-gradient(135deg,#667eea,#764ba2);color:white;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;">✨ 生日祝福</button>' +
              '<button onclick="openBdPolicySummary(\''+safeId+'\',\''+safeName+'\')" ' +
                'style="flex:1;padding:9px;background:var(--primary);color:white;border:none;border-radius:var(--radius-sm);font-size:12px;font-weight:700;cursor:pointer;">📋 保單</button>' +
            '</div>' +
          '</div>';
      });
      html += '<button onclick="loadBirthdayMonthSummary()" style="width:100%;padding:10px;background:#F5F5F5;color:var(--text2);border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;margin-top:4px;">← 返回月份總覽</button>';
      area.innerHTML = html;
    };
    if (_directShellUrl) directGasCall('getBirthdayList', { month: month, day: 0 }, fn, function(){ document.getElementById('loading').style.display='none'; });
    else gasCall('getBirthdayList', { month: month, day: 0 }, fn, function(){ document.getElementById('loading').style.display='none'; });
  }


// ══════════════════════════════════════════════════════
// ★ 把 index.html 內 onclick="..." 會呼叫到的函式，以及被其他模組
//   （lock.js、family-report.js）當作共用工具呼叫的 showBdToast，
//   expose 到全域
// ══════════════════════════════════════════════════════
window.toggleBirthdayPanel      = toggleBirthdayPanel;
window.markBirthdaySent         = markBirthdaySent;
window.openBirthdayGreeting     = openBirthdayGreeting;
window.setBdSalute              = setBdSalute;
window.setBdSaluteCustom        = setBdSaluteCustom;
window.setBdStyle               = setBdStyle;
window.cycleBdMsg               = cycleBdMsg;
window.bdCopyPhone              = bdCopyPhone;
window.bdOpen711                = bdOpen711;
window.bdCopyMsg                = bdCopyMsg;
window.bdOpenLine               = bdOpenLine;
window.bdDone                   = bdDone;
window.openBdPolicySummary      = openBdPolicySummary;
window.openDetailFromSummary    = openDetailFromSummary;
window.closeBdOverlay           = closeBdOverlay;
window.loadBirthdayMonthSummary = loadBirthdayMonthSummary;
window.loadBirthdayByMonth      = loadBirthdayByMonth;
window.showBdToast              = showBdToast;
window.loadTodayBirthdays        = loadTodayBirthdays;
