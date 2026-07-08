// ══════════════════════════════════════════════════════
// tasks.js — 代辦清單（ES Module）
// 原本位於 index.html 第 3000–3264 行，拆分示範
// 依賴（來自尚未拆分的 auth.js 區塊，皆為全域變數/函式，載入順序已確保先於本模組執行）：
//   gasCall, directGasCall, _directShellUrl, _prefetchedTasks
// ══════════════════════════════════════════════════════

  // ══════════════════════════════════════════════════════
  // ★ 代辦清單（共用，使用 gasCall JSONP）
  // ══════════════════════════════════════════════════════
  var _tasks = [];

  function loadTasks() {
    // 【雙軌優化】如果是直連捷徑，直連地方薄殼；否則走傳統中央驗證
    if (_directShellUrl) {
      directGasCall('getTasks', {}, function(result) {
        _tasks = (result && result.tasks) ? result.tasks : [];
        renderTasks();
      }, function() {
        document.getElementById('taskListBody').innerHTML =
          '<div style="color:var(--text3);font-size:13px;text-align:center;padding:10px;">載入失敗，請稍後再試</div>';
      });
    } else {
      gasCall('getTasks', {}, function(result) {
        _tasks = (result && result.tasks) ? result.tasks : [];
        renderTasks();
      }, function() {
        document.getElementById('taskListBody').innerHTML =
          '<div style="color:var(--text3);font-size:13px;text-align:center;padding:10px;">載入失敗，請稍後再試</div>';
      });
    }
  }

  var _showDoneTasks = false;

  function renderTasks() {
    var body = document.getElementById('taskListBody');
    if (!_tasks || _tasks.length === 0) {
      body.innerHTML = '<div style="color:var(--text3);font-size:13px;text-align:center;padding:10px;">目前沒有代辦事項</div>';
      return;
    }

    // 已完成的全部預設隱藏
    var hiddenDone = _tasks.filter(function(t){ return t.status === '已完成'; });
    var visible    = _tasks.filter(function(t){ return t.status !== '已完成' || _showDoneTasks; });

    var html = '';
    if (!_showDoneTasks && hiddenDone.length > 0) {
      html += '<div onclick="_tasksShowDone(true)" ' +
        'style="cursor:pointer;text-align:center;color:var(--text3);font-size:12px;padding:7px;background:#f9f9f9;border-radius:8px;margin-bottom:6px;">' +
        '📂 已完成並隱藏 ' + hiddenDone.length + ' 筆　▼ 點擊展開</div>';
    } else if (_showDoneTasks && hiddenDone.length > 0) {
      html += '<div onclick="_tasksShowDone(false)" ' +
        'style="cursor:pointer;text-align:center;color:var(--text3);font-size:12px;padding:7px;background:#f9f9f9;border-radius:8px;margin-bottom:6px;">' +
        '📂 收起已完成記錄　▲</div>';
    }

    visible.forEach(function(t) {
      var isDone  = t.status === '已完成';
      var isWip   = t.status === '處理中';
      var badgeBg  = t.isToday ? '#FFF3E0' : (t.isPast && !isDone) ? '#FFEBEE' : '#E8F5E9';
      var badgeClr = t.isToday ? '#E65100' : (t.isPast && !isDone) ? '#C62828' : '#2E7D32';
      var badgeTxt = t.isToday ? '📌 今日' : (t.isPast && !isDone) ? '⚠️ 已過期' : '📅 ' + t.date;
      var statusBadge = isDone ? '<span style="background:#E8F5E9;color:#2E7D32;font-size:11px;font-weight:bold;padding:2px 8px;border-radius:var(--radius-md);">✅ 已完成</span>'
                      : isWip  ? '<span style="background:#FFF8E1;color:#F57F17;font-size:11px;font-weight:bold;padding:2px 8px;border-radius:var(--radius-md);">🔄 處理中</span>' : '';
      var cardOp  = isDone ? 'opacity:0.6;' : '';
      var contSt  = isDone ? 'text-decoration:line-through;color:var(--text3);' : 'color:var(--text1);font-weight:bold;';
      var safeId  = t.taskId.replace(/'/g,'');
      var safeNote = (t.note || '').replace(/\\/g,'\\\\').replace(/'/g,"\\'");

      html += '<div style="padding:10px 0;border-bottom:1px solid #f5f5f5;' + cardOp + '">' +
        '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;flex-wrap:wrap;">' +
          '<span style="background:' + badgeBg + ';color:' + badgeClr + ';font-size:11px;font-weight:bold;padding:2px 8px;border-radius:var(--radius-md);">' + badgeTxt + '</span>' +
          statusBadge +
          (t.author ? '<span style="font-size:11px;color:var(--text3);">' + t.author + '</span>' : '') +
          '<button onclick="deleteTaskItem(\'' + safeId + '\')" style="margin-left:auto;background:#FFEBEE;color:#C62828;border:none;border-radius:6px;font-size:12px;font-weight:bold;cursor:pointer;padding:3px 8px;">🗑️ 刪除</button>' +
        '</div>' +
        '<div style="font-size:14px;' + contSt + 'margin-bottom:6px;">' + t.content + '</div>' +
        (t.note ? '<div style="font-size:12px;color:var(--text3);background:#f8f8f8;border-radius:6px;padding:4px 8px;margin-bottom:6px;">📝 ' + t.note + '</div>' : '') +
        '<div data-task-id="' + safeId + '" style="display:flex;gap:6px;">' +
          (!isDone ? '<button onclick="openTaskUpdate(\'' + safeId + '\',\'' + (t.status||'') + '\',\'' + safeNote + '\')" style="font-size:12px;padding:4px 10px;background:#f5f5f5;color:var(--text2);border:1px solid #ddd;border-radius:6px;cursor:pointer;font-weight:bold;">✏️ 更新進度</button>' : '') +
          (isDone ? '<button onclick="clearTaskDone(\'' + safeId + '\')" style="font-size:12px;padding:4px 10px;background:#f5f5f5;color:var(--text3);border:1px solid #ddd;border-radius:6px;cursor:pointer;">↩ 重設</button>' : '') +
        '</div>' +
      '</div>';
    });
    body.innerHTML = html;
  }

  function openTaskUpdate(taskId, currentStatus, currentNote) {
    var containerId = 'taskUpdate_' + taskId;
    var existing = document.getElementById(containerId);
    if (existing) { existing.style.display = existing.style.display === 'none' ? 'block' : 'none'; return; }
    var btnRow = document.querySelector('[data-task-id="' + taskId + '"]');
    if (!btnRow) return;
    var panel = document.createElement('div');
    panel.id = containerId;
    panel._selectedStatus = currentStatus || '';
    panel.style.cssText = 'margin-top:8px;background:#f8f9fa;border-radius:8px;padding:12px;border:1px solid #e0e0e0;';
    // 標題
    var title = document.createElement('div');
    title.style.cssText = 'font-size:12px;color:var(--text3);margin-bottom:8px;font-weight:bold;';
    title.textContent = '更新處理進度';
    panel.appendChild(title);
    // 狀態按鈕
    var btnRow2 = document.createElement('div');
    btnRow2.style.cssText = 'display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap;';
    function makeBtn(label, emoji, status, activeBg, activeBorder, activeClr, inactiveBg, inactiveBorder) {
      var btn = document.createElement('button');
      btn.id = 'stBtn_' + status + '_' + taskId;
      btn.textContent = emoji + ' ' + label;
      var isActive = (panel._selectedStatus === status);
      btn.style.cssText = 'flex:1;min-width:70px;padding:7px 4px;border-radius:6px;font-size:13px;font-weight:bold;cursor:pointer;' +
        (isActive ? 'background:' + activeBg + ';color:' + activeClr + ';border:2px solid ' + activeBorder + ';'
                  : 'background:' + inactiveBg + ';color:' + activeClr + ';border:1px solid ' + inactiveBorder + ';');
      btn.onclick = function() { selectTaskStatus(taskId, status); };
      return btn;
    }
    btnRow2.appendChild(makeBtn('處理中','🔄','處理中','#fde68a','#f59e0b','#854d0e','#FFF8E1','#fde68a'));
    btnRow2.appendChild(makeBtn('已完成','✅','已完成','#86efac','#16a34a','#166534','#E8F5E9','#86efac'));
    var resetBtn = document.createElement('button');
    resetBtn.id = 'stBtn__' + taskId;
    resetBtn.textContent = '↩ 重設';
    var isReset = (panel._selectedStatus === '');
    resetBtn.style.cssText = 'flex:1;min-width:70px;padding:7px 4px;border-radius:6px;font-size:13px;font-weight:bold;cursor:pointer;' +
      (isReset ? 'background:#e0e0e0;color:var(--text1);border:2px solid #9E9E9E;' : 'background:#f5f5f5;color:var(--text3);border:1px solid #ddd;');
    resetBtn.onclick = function() { selectTaskStatus(taskId, ''); };
    btnRow2.appendChild(resetBtn);
    panel.appendChild(btnRow2);
    // 備註輸入
    var noteInput = document.createElement('input');
    noteInput.type = 'text'; noteInput.id = 'taskNote_' + taskId;
    noteInput.placeholder = '備註說明（可留空）'; noteInput.value = currentNote || '';
    noteInput.style.cssText = 'width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid #ddd;border-radius:6px;font-size:13px;margin-bottom:10px;';
    panel.appendChild(noteInput);
    // 儲存＋取消
    var actionRow = document.createElement('div');
    actionRow.style.cssText = 'display:flex;gap:8px;';
    var saveBtn = document.createElement('button');
    saveBtn.id = 'taskSaveBtn_' + taskId; saveBtn.textContent = '💾 儲存';
    saveBtn.style.cssText = 'flex:2;padding:10px;background:#00A3C4;color:white;border:none;border-radius:6px;font-size:14px;font-weight:bold;cursor:pointer;';
    saveBtn.onclick = function() { saveTaskUpdate(taskId, containerId); };
    actionRow.appendChild(saveBtn);
    var cancelBtn = document.createElement('button');
    cancelBtn.textContent = '取消';
    cancelBtn.style.cssText = 'flex:1;padding:10px;background:#f5f5f5;color:var(--text2);border:none;border-radius:6px;font-size:14px;cursor:pointer;';
    cancelBtn.onclick = function() { panel.style.display = 'none'; };
    actionRow.appendChild(cancelBtn);
    panel.appendChild(actionRow);
    btnRow.parentNode.insertBefore(panel, btnRow.nextSibling);
  }

  function selectTaskStatus(taskId, status) {
    var panel = document.getElementById('taskUpdate_' + taskId);
    if (!panel) return;
    panel._selectedStatus = status;
    var configs = [
      { key:'處理中', activeBg:'#fde68a', activeBorder:'#f59e0b', activeClr:'#854d0e', inactiveBg:'#FFF8E1', inactiveBorder:'#fde68a', fw:'bold' },
      { key:'已完成', activeBg:'#86efac', activeBorder:'#16a34a', activeClr:'#166534', inactiveBg:'#E8F5E9', inactiveBorder:'#86efac', fw:'bold' },
      { key:'',       activeBg:'#e0e0e0', activeBorder:'#9E9E9E', activeClr:'#333',    inactiveBg:'#f5f5f5', inactiveBorder:'#ddd',    fw:'bold' }
    ];
    configs.forEach(function(c) {
      var btn = document.getElementById('stBtn_' + c.key + '_' + taskId);
      if (!btn) return;
      btn.style.cssText = 'flex:1;min-width:70px;padding:7px 4px;border-radius:6px;font-size:13px;font-weight:' + c.fw + ';cursor:pointer;' +
        (status === c.key
          ? 'background:' + c.activeBg   + ';color:' + c.activeClr + ';border:2px solid ' + c.activeBorder + ';'
          : 'background:' + c.inactiveBg + ';color:' + c.activeClr + ';border:1px solid ' + c.inactiveBorder + ';');
    });
  }

  function saveTaskUpdate(taskId, containerId) {
    var panel     = document.getElementById(containerId);
    var newStatus = panel ? (panel._selectedStatus !== undefined ? panel._selectedStatus : '') : '';
    var noteEl    = document.getElementById('taskNote_' + taskId);
    var note      = noteEl ? noteEl.value.trim() : '';
    var saveBtn   = document.getElementById('taskSaveBtn_' + taskId);
    if (saveBtn) { saveBtn.textContent = '儲存中...'; saveBtn.disabled = true; }
    
    var onSuccess = function(result) {
      if (result && result.success) { loadTasks(); }
      else {
        if (saveBtn) { saveBtn.textContent = '💾 儲存'; saveBtn.disabled = false; }
        alert('儲存失敗，請稍後再試');
      }
    };
    
    var onFail = function() {
      if (saveBtn) { saveBtn.textContent = '💾 儲存'; saveBtn.disabled = false; }
      alert('連線失敗，請重試');
    };

    // 【雙軌優化】
    if (_directShellUrl) {
      directGasCall('updateTask', { taskId: taskId, status: newStatus, note: note }, onSuccess, onFail);
    } else {
      gasCall('updateTask', { taskId: taskId, status: newStatus, note: note }, onSuccess, onFail);
    }
  }

  function clearTaskDone(taskId) {
    // 【雙軌優化】重置任務進度
    if (_directShellUrl) {
      directGasCall('updateTask', { taskId: taskId, status: '', note: '' }, function() { loadTasks(); }, null);
    } else {
      gasCall('updateTask', { taskId: taskId, status: '', note: '' }, function() { loadTasks(); }, null);
    }
  }

  function submitTask() {
    var date      = document.getElementById('taskDate').value.replace(/-/g, '/');
    var taskCont  = document.getElementById('taskContent').value.trim();
    var agentInput= document.getElementById('taskAgentCode');
    var agentCode = agentInput && agentInput.value.trim() ? agentInput.value.trim() : ADVISOR_NAME;
    if (!date || !taskCont) { alert('請填寫日期和內容'); return; }
    var btn = document.getElementById('taskSubmitBtn');
    btn.disabled = true; btn.textContent = '儲存中...';
    
    // 定義儲存成功的共用回呼
    var onSuccess = function(result) {
      btn.disabled = false; btn.textContent = '➕ 新增';
      if (result && result.success) { document.getElementById('taskContent').value = ''; if(document.getElementById('taskAgentCode')) document.getElementById('taskAgentCode').value=''; loadTasks(); }
      else { alert('儲存失敗'); }
    };
    
    var onFail = function() {
      btn.disabled = false; btn.textContent = '➕ 新增';
      alert('連線失敗，請重試');
    };

    // 【雙軌優化】
    if (_directShellUrl) {
      directGasCall('saveTask', { date: date, content: taskCont, author: agentCode }, onSuccess, onFail);
    } else {
      gasCall('saveTask', { date: date, content: taskCont, author: agentCode }, onSuccess, onFail);
    }
  }
  function deleteTaskItem(taskId) {
    if (!confirm('確定刪除此代辦事項？')) return;
    
    var onSuccess = function(result) {
      if (result && result.success) { _tasks = _tasks.filter(function(t) { return t.taskId !== taskId; }); renderTasks(); }
    };

    // 【雙軌優化】
    if (_directShellUrl) {
      directGasCall('deleteTask', { taskId: taskId }, onSuccess, null);
    } else {
      gasCall('deleteTask', { taskId: taskId }, onSuccess, null);
    }
  }

  function toggleTaskPanel() {
    var panel = document.getElementById('taskPanel');
    var isOpen = panel.style.display !== 'none';
    panel.style.display = isOpen ? 'none' : 'block';
    if (!isOpen) {
      if (_prefetchedTasks !== null) {
        // ★ 有預載資料：直接渲染，不呼叫 API（瞬間顯示）
        _tasks = (_prefetchedTasks && _prefetchedTasks.tasks)
                 ? _prefetchedTasks.tasks : [];
        _prefetchedTasks = null;  // 用完清空，下次展開才重新載入
        renderTasks();
      } else {
        // 無預載（背景載入失敗或已用過）：即時呼叫 API
        loadTasks();
      }
    }
  }


// ══════════════════════════════════════════════════════
// ★ 修正：_showDoneTasks 是本模組內的區域變數，原本 inline onclick
//   直接寫 "_showDoneTasks=true" 會在全域作用域賦值、抓不到這裡的變數，
//   改用這個小函式在模組內部正確切換
// ══════════════════════════════════════════════════════
function _tasksShowDone(show) {
  _showDoneTasks = show;
  renderTasks();
}

// ══════════════════════════════════════════════════════
// ★ 把 index.html 內 onclick="..." 會呼叫到的函式 expose 到全域
// ══════════════════════════════════════════════════════
window.renderTasks      = renderTasks;
window.openTaskUpdate   = openTaskUpdate;
window.clearTaskDone    = clearTaskDone;
window.submitTask       = submitTask;
window.deleteTaskItem   = deleteTaskItem;
window.toggleTaskPanel  = toggleTaskPanel;
window._tasksShowDone   = _tasksShowDone;
