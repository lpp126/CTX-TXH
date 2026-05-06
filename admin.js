(function () {
  'use strict';

  var STORAGE_KEY = 'yyrl_admin_key_v1';
  var LOGGED_KEY = 'yyrl_admin_logged_v1';

  var state = {
    key: '',
    claims: null,
    projects: null
  };

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>]/g, function (m) {
      if (m === '&') return '&amp;';
      if (m === '<') return '&lt;';
      if (m === '>') return '&gt;';
      return m;
    });
  }

  function cellHtml(val) {
    var s = String(val == null ? '' : val);
    if (/^https?:\/\//i.test(s)) {
      return '<a class="link" href="' + encodeURI(s) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(s) + '</a>';
    }
    return escapeHtml(s);
  }

  function showMsg(panel, text, ok) {
    var el = panel === 'claims' ? $('msgClaims') : $('msgProjects');
    el.textContent = text;
    el.className = 'msg show ' + (ok ? 'ok' : 'err');
    clearTimeout(showMsg._t);
    showMsg._t = setTimeout(function () {
      el.className = 'msg';
    }, 5200);
  }

  function readKeyFromStorage() {
    try {
      return sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY) || '';
    } catch (e) {
      return '';
    }
  }

  function writeKeyToStorage(key, remember) {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_KEY);
      if (!key) return;
      if (remember) localStorage.setItem(STORAGE_KEY, key);
      else sessionStorage.setItem(STORAGE_KEY, key);
    } catch (e) { /* ignore */ }
  }

  function clearAuth() {
    try {
      sessionStorage.removeItem(LOGGED_KEY);
      sessionStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) { /* ignore */ }
    state.key = '';
  }

  function getKey() {
    if (state.key) return state.key;
    return readKeyFromStorage();
  }

  function scriptOk() {
    var u = window.YYRL_API && window.YYRL_API.scriptUrl();
    return u && u.indexOf('你的脚本ID') === -1;
  }

  async function adminMutate(fields) {
    if (!window.YYRL_API) throw new Error('API 未加载');
    await window.YYRL_API.adminPost(fields);
    await new Promise(function (r) {
      setTimeout(r, 480);
    });
  }

  function setView(loggedIn) {
    $('view-login').hidden = loggedIn;
    $('view-app').hidden = !loggedIn;
  }

  function setTab(which) {
    var claims = which === 'claims';
    $('tabClaims').setAttribute('aria-selected', claims ? 'true' : 'false');
    $('tabProjects').setAttribute('aria-selected', claims ? 'false' : 'true');
    $('panelClaims').hidden = !claims;
    $('panelProjects').hidden = claims;
  }

  function renderClaimsTable() {
    var payload = state.claims;
    var thead = $('theadClaims');
    var tbody = $('tbodyClaims');
    var empty = $('emptyClaims');
    var meta = $('metaClaims');
    thead.innerHTML = '';
    tbody.innerHTML = '';

    if (!payload || !payload.headers || !payload.headers.length) {
      empty.hidden = false;
      meta.textContent = '无表头或空表';
      return;
    }
    empty.hidden = true;

    var headers = payload.headers;
    var rows = payload.rows || [];
    var sheetRows = payload.sheetRows || [];
    var kw = ($('filterClaims').value || '').trim().toLowerCase();

    var hr = document.createElement('tr');
    var th0 = document.createElement('th');
    th0.textContent = '行';
    hr.appendChild(th0);
    headers.forEach(function (h) {
      var th = document.createElement('th');
      th.textContent = h == null ? '' : String(h);
      hr.appendChild(th);
    });
    var thOp = document.createElement('th');
    thOp.textContent = '操作';
    hr.appendChild(thOp);
    thead.appendChild(hr);

    var shown = 0;
    rows.forEach(function (row, idx) {
      var sheetRow = sheetRows[idx];
      var line = row.map(function (c) {
        return c == null ? '' : String(c);
      }).join(' ');
      if (kw && line.toLowerCase().indexOf(kw) === -1) return;

      var tr = document.createElement('tr');
      var td0 = document.createElement('td');
      td0.className = 'mono';
      td0.textContent = String(sheetRow);
      tr.appendChild(td0);

      headers.forEach(function (_, i) {
        var td = document.createElement('td');
        td.innerHTML = cellHtml(row[i]);
        tr.appendChild(td);
      });

      var tdOp = document.createElement('td');
      var wrap = document.createElement('div');
      wrap.className = 'ops';

      var bEdit = document.createElement('button');
      bEdit.type = 'button';
      bEdit.className = 'btn';
      bEdit.textContent = '编辑';
      bEdit.addEventListener('click', function () {
        openClaimDialog('edit', sheetRow, row.slice());
      });

      var bDel = document.createElement('button');
      bDel.type = 'button';
      bDel.className = 'btn btn-danger';
      bDel.textContent = '删除';
      bDel.addEventListener('click', function () {
        if (!confirm('确定删除第 ' + sheetRow + ' 行吗？此操作不可撤销。')) return;
        doDeleteClaim(sheetRow);
      });

      wrap.appendChild(bEdit);
      wrap.appendChild(bDel);
      tdOp.appendChild(wrap);
      tr.appendChild(tdOp);

      tbody.appendChild(tr);
      shown++;
    });

    if (!tbody.children.length) {
      empty.hidden = false;
    }
    meta.textContent = '共 ' + rows.length + ' 条，当前显示 ' + shown + ' 条';
  }

  function renderProjectsTable() {
    var payload = state.projects;
    var thead = $('theadProjects');
    var tbody = $('tbodyProjects');
    var empty = $('emptyProjects');
    var meta = $('metaProjects');
    thead.innerHTML = '';
    tbody.innerHTML = '';

    if (!payload || !payload.headers || !payload.headers.length) {
      empty.hidden = false;
      meta.textContent = '无数据';
      return;
    }
    empty.hidden = true;

    var headers = payload.headers;
    var rows = payload.rows || [];
    var sheetRows = payload.sheetRows || [];
    var kw = ($('filterProjects').value || '').trim().toLowerCase();

    var hr = document.createElement('tr');
    var th0 = document.createElement('th');
    th0.textContent = '行';
    hr.appendChild(th0);
    headers.forEach(function (h) {
      var th = document.createElement('th');
      th.textContent = h == null ? '' : String(h);
      hr.appendChild(th);
    });
    var thOp = document.createElement('th');
    thOp.textContent = '操作';
    hr.appendChild(thOp);
    thead.appendChild(hr);

    var shown = 0;
    rows.forEach(function (row, idx) {
      var sheetRow = sheetRows[idx];
      var line = row.map(function (c) {
        return c == null ? '' : String(c);
      }).join(' ');
      if (kw && line.toLowerCase().indexOf(kw) === -1) return;

      var tr = document.createElement('tr');
      var td0 = document.createElement('td');
      td0.className = 'mono';
      td0.textContent = String(sheetRow);
      tr.appendChild(td0);

      headers.forEach(function (_, i) {
        var td = document.createElement('td');
        td.innerHTML = cellHtml(row[i]);
        tr.appendChild(td);
      });

      var tdOp = document.createElement('td');
      var wrap = document.createElement('div');
      wrap.className = 'ops';

      var bEdit = document.createElement('button');
      bEdit.type = 'button';
      bEdit.className = 'btn';
      bEdit.textContent = '编辑';
      bEdit.addEventListener('click', function () {
        openProjectDialog('edit', sheetRow, row.slice());
      });

      var bDel = document.createElement('button');
      bDel.type = 'button';
      bDel.className = 'btn btn-danger';
      bDel.textContent = '删除';
      bDel.addEventListener('click', function () {
        if (!confirm('确定删除该项目行吗？认领页将不再展示该行（若已启用）。')) return;
        doDeleteProject(sheetRow);
      });

      wrap.appendChild(bEdit);
      wrap.appendChild(bDel);
      tdOp.appendChild(wrap);
      tr.appendChild(tdOp);

      tbody.appendChild(tr);
      shown++;
    });

    if (!tbody.children.length) empty.hidden = false;
    meta.textContent = '共 ' + rows.length + ' 条，当前显示 ' + shown + ' 条';
  }

  function valToInputString(v) {
    if (v == null) return '';
    if (Object.prototype.toString.call(v) === '[object Date]') return v.toISOString ? v.toISOString() : String(v);
    return String(v);
  }

  function buildDynamicFields(container, headers, values) {
    container.innerHTML = '';
    headers.forEach(function (h, i) {
      var wrap = document.createElement('div');
      wrap.className = 'field';
      var lab = document.createElement('label');
      lab.textContent = h == null ? '列 ' + (i + 1) : String(h);
      lab.setAttribute('for', 'cf_' + i);
      var input =
        String(h || '').indexOf('备注') !== -1 || String(h || '').toLowerCase().indexOf('note') !== -1
          ? document.createElement('textarea')
          : document.createElement('input');
      input.className = 'input';
      input.id = 'cf_' + i;
      if (input.tagName === 'INPUT') input.type = 'text';
      else {
        input.rows = 4;
      }
      input.value = values && values[i] != null ? valToInputString(values[i]) : '';
      wrap.appendChild(lab);
      wrap.appendChild(input);
      container.appendChild(wrap);
    });
  }

  function collectDynamicFields(n) {
    var vals = [];
    for (var i = 0; i < n; i++) {
      var el = $('cf_' + i);
      vals.push(el ? el.value : '');
    }
    return vals;
  }

  function openClaimDialog(mode, sheetRow, rowValues) {
    var dlg = $('dlgClaim');
    var title = $('dlgClaimTitle');
    var fields = $('dlgClaimFields');
    dlg.dataset.mode = mode;
    dlg.dataset.row = sheetRow != null ? String(sheetRow) : '';

    if (!state.claims || !state.claims.headers) {
      showMsg('claims', '请先刷新认领数据', false);
      return;
    }

    title.textContent = mode === 'add' ? '新增认领' : '编辑认领（第 ' + sheetRow + ' 行）';

    var headers = state.claims.headers.slice();
    var seed =
      mode === 'add'
        ? headers.map(function (h, i) {
            if (i === 0) return new Date().toLocaleString('zh-CN');
            if (/状态/i.test(String(h || ''))) return '待确认';
            return '';
          })
        : rowValues || [];

    buildDynamicFields(fields, headers, seed);
    dlg.showModal();
  }

  function openProjectDialog(mode, sheetRow, rowValues) {
    var dlg = $('dlgProject');
    var title = $('dlgProjectTitle');
    var fields = $('dlgProjectFields');
    dlg.dataset.mode = mode;
    dlg.dataset.row = sheetRow != null ? String(sheetRow) : '';

    title.textContent = mode === 'add' ? '新增应援项目' : '编辑应援项目（第 ' + sheetRow + ' 行）';

    fields.innerHTML = '';

    var v0 = mode === 'add' ? '' : valToInputString(rowValues && rowValues[0]);
    var v1 = mode === 'add' ? '' : valToInputString(rowValues && rowValues[1]);
    var v2 = mode === 'add' ? '0' : valToInputString(rowValues && rowValues[2]);
    var active =
      mode === 'add'
        ? true
        : (function () {
            var a = rowValues && rowValues[3];
            var s = String(a == null ? '' : a).trim().toLowerCase();
            return s === '1' || s === 'true' || s === 'y' || s === 'yes' || s === '是';
          })();

    function addField(id, labelText, value, type) {
      var wrap = document.createElement('div');
      wrap.className = 'field';
      var lab = document.createElement('label');
      lab.setAttribute('for', id);
      lab.textContent = labelText;
      var input = document.createElement('input');
      input.id = id;
      input.className = 'input';
      input.type = type || 'text';
      input.value = value;
      wrap.appendChild(lab);
      wrap.appendChild(input);
      fields.appendChild(wrap);
    }

    addField('pf_name', '名称', v0, 'text');
    addField('pf_target', '目标说明', v1, 'text');
    addField('pf_order', '排序（数字）', v2, 'number');

    var wrapA = document.createElement('div');
    wrapA.className = 'field';
    var labA = document.createElement('label');
    labA.setAttribute('for', 'pf_active');
    labA.textContent = '启用';
    var row = document.createElement('div');
    row.className = 'chk';
    var cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.id = 'pf_active';
    cb.checked = !!active;
    row.appendChild(cb);
    row.appendChild(document.createTextNode('启用后会在认领页展示'));
    wrapA.appendChild(labA);
    wrapA.appendChild(row);
    fields.appendChild(wrapA);

    dlg.showModal();
  }

  async function reloadClaims() {
    if (!scriptOk()) {
      showMsg('claims', '请先在 config.js 配置 GOOGLE_SCRIPT_URL', false);
      return;
    }
    var key = getKey();
    if (!key) {
      showMsg('claims', '未找到密钥，请重新登录', false);
      return;
    }
    try {
      var data = await window.YYRL_API.getClaims(key);
      if (!data || data.error === 'unauthorized') {
        showMsg('claims', '密钥失效或无权限，请重新登录', false);
        clearAuth();
        setView(false);
        return;
      }
      if (data.error) {
        showMsg('claims', '加载失败：' + data.error, false);
        return;
      }
      state.claims = data;
      renderClaimsTable();
      showMsg('claims', '认领数据已更新', true);
    } catch (e) {
      showMsg('claims', e.message || String(e), false);
    }
  }

  async function reloadProjects() {
    if (!scriptOk()) {
      showMsg('projects', '请先在 config.js 配置 GOOGLE_SCRIPT_URL', false);
      return;
    }
    var key = getKey();
    if (!key) {
      showMsg('projects', '未找到密钥，请重新登录', false);
      return;
    }
    try {
      var data = await window.YYRL_API.getProjectsAdmin(key);
      if (!data || data.error === 'unauthorized') {
        showMsg('projects', '密钥失效或无权限，请重新登录', false);
        clearAuth();
        setView(false);
        return;
      }
      if (data.error) {
        showMsg('projects', '加载失败：' + data.error, false);
        return;
      }
      state.projects = data;
      renderProjectsTable();
      showMsg('projects', '项目列表已更新', true);
    } catch (e) {
      showMsg('projects', e.message || String(e), false);
    }
  }

  async function doDeleteClaim(sheetRow) {
    try {
      await adminMutate({
        action: 'delete_claim',
        key: getKey(),
        row: String(sheetRow)
      });
      await reloadClaims();
      showMsg('claims', '删除请求已发送（如未消失请再点刷新核对）', true);
    } catch (e) {
      showMsg('claims', e.message || String(e), false);
    }
  }

  async function doDeleteProject(sheetRow) {
    try {
      await adminMutate({
        action: 'project_delete',
        key: getKey(),
        row: String(sheetRow)
      });
      await reloadProjects();
      showMsg('projects', '删除请求已发送', true);
    } catch (e) {
      showMsg('projects', e.message || String(e), false);
    }
  }

  function exportClaimsCsv() {
    var payload = state.claims;
    if (!payload || !payload.headers || !payload.headers.length) {
      showMsg('claims', '请先加载认领数据', false);
      return;
    }
    var headers = payload.headers.slice();
    var rows = payload.rows || [];
    var sheetRows = payload.sheetRows || [];
    var kw = ($('filterClaims').value || '').trim().toLowerCase();

    function esc(v) {
      var s = v == null ? '' : String(v);
      if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    }

    var lines = [['行'].concat(headers).map(esc).join(',')];
    rows.forEach(function (row, idx) {
      var line = row.map(function (c) {
        return c == null ? '' : String(c);
      }).join(' ');
      if (kw && line.toLowerCase().indexOf(kw) === -1) return;
      var sr = sheetRows[idx];
      lines.push([sr].concat(row).map(esc).join(','));
    });

    var blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '认领记录_' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
    URL.revokeObjectURL(a.href);
    showMsg('claims', '已导出 CSV（受筛选影响）', true);
  }

  async function tryLogin() {
    $('loginMsg').className = 'msg';
    if (!scriptOk()) {
      $('loginMsg').textContent = '请先在 config.js 配置 GOOGLE_SCRIPT_URL';
      $('loginMsg').className = 'msg show err';
      return;
    }
    var key = ($('loginKey').value || '').trim();
    if (!key) {
      $('loginMsg').textContent = '请输入管理密钥';
      $('loginMsg').className = 'msg show err';
      return;
    }

    $('btnLogin').disabled = true;
    try {
      var data = await window.YYRL_API.ping(key);
      if (!data || data.error === 'unauthorized' || !data.ok) {
        $('loginMsg').textContent = '密钥错误，请重试';
        $('loginMsg').className = 'msg show err';
        return;
      }
      state.key = key;
      writeKeyToStorage(key, $('rememberKey').checked);
      try {
        sessionStorage.setItem(LOGGED_KEY, '1');
      } catch (e) { /* ignore */ }
      setView(true);
      $('whoami').textContent = '已登录（密钥仅保存在本机）';
      await reloadClaims();
      await reloadProjects();
    } catch (e) {
      $('loginMsg').textContent = e.message || String(e);
      $('loginMsg').className = 'msg show err';
    } finally {
      $('btnLogin').disabled = false;
    }
  }

  function logout() {
    clearAuth();
    $('loginKey').value = '';
    setView(false);
  }

  function wire() {
    $('btnLogin').addEventListener('click', tryLogin);
    $('btnLogout').addEventListener('click', logout);

    $('tabClaims').addEventListener('click', function () {
      setTab('claims');
    });
    $('tabProjects').addEventListener('click', function () {
      setTab('projects');
    });

    $('btnReloadClaims').addEventListener('click', reloadClaims);
    $('btnReloadProjects').addEventListener('click', reloadProjects);
    $('filterClaims').addEventListener('input', function () {
      if (state.claims) renderClaimsTable();
    });
    $('filterProjects').addEventListener('input', function () {
      if (state.projects) renderProjectsTable();
    });

    $('btnCsvClaims').addEventListener('click', exportClaimsCsv);
    $('btnAddClaim').addEventListener('click', function () {
      openClaimDialog('add', null, null);
    });
    $('btnAddProject').addEventListener('click', function () {
      openProjectDialog('add', null, null);
    });

    $('dlgClaimCancel').addEventListener('click', function () {
      $('dlgClaim').close();
    });
    $('dlgProjectCancel').addEventListener('click', function () {
      $('dlgProject').close();
    });

    $('dlgClaimSave').addEventListener('click', async function () {
      var dlg = $('dlgClaim');
      var mode = dlg.dataset.mode;
      var row = dlg.dataset.row;
      var headers = state.claims && state.claims.headers;
      if (!headers) return;
      var vals = collectDynamicFields(headers.length);
      while (vals.length < headers.length) vals.push('');
      if (vals.length > headers.length) vals = vals.slice(0, headers.length);

      $('dlgClaimSave').disabled = true;
      try {
        if (mode === 'edit') {
          await adminMutate({
            action: 'update_claim',
            key: getKey(),
            row: row,
            values: JSON.stringify(vals)
          });
        } else {
          await adminMutate({
            action: 'append_claim_admin',
            key: getKey(),
            values: JSON.stringify(vals)
          });
        }
        dlg.close();
        await reloadClaims();
        showMsg('claims', '保存请求已发送（建议刷新核对）', true);
      } catch (e) {
        showMsg('claims', e.message || String(e), false);
      } finally {
        $('dlgClaimSave').disabled = false;
      }
    });

    $('dlgProjectSave').addEventListener('click', async function () {
      var dlg = $('dlgProject');
      var mode = dlg.dataset.mode;
      var row = dlg.dataset.row;
      var name = ($('pf_name').value || '').trim();
      if (!name) {
        showMsg('projects', '名称不能为空', false);
        return;
      }
      var target = ($('pf_target').value || '').trim();
      var order = String($('pf_order').value || '0');
      var active = $('pf_active').checked ? '1' : '0';

      $('dlgProjectSave').disabled = true;
      try {
        var fields = {
          action: 'project_upsert',
          key: getKey(),
          name: name,
          target: target,
          order: order,
          active: active
        };
        if (mode === 'edit') fields.row = row;
        await adminMutate(fields);
        dlg.close();
        await reloadProjects();
        showMsg('projects', '项目保存请求已发送', true);
      } catch (e) {
        showMsg('projects', e.message || String(e), false);
      } finally {
        $('dlgProjectSave').disabled = false;
      }
    });
  }

  function boot() {
    wire();
    setTab('claims');

    try {
      if (localStorage.getItem(STORAGE_KEY)) $('rememberKey').checked = true;
    } catch (e) { /* ignore */ }

    try {
      var logged = sessionStorage.getItem(LOGGED_KEY) === '1';
      var k = readKeyFromStorage();
      if (logged && k) {
        $('loginKey').value = k;
        state.key = k;
        setView(true);
        reloadClaims();
        reloadProjects();
      } else {
        setView(false);
        if (k) $('loginKey').value = k;
      }
    } catch (e) {
      setView(false);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
