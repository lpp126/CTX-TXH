(function () {
  'use strict';

  var cfg = window.YYRL_CONFIG || {};
  var projectsCache = [];
  var currentProject = null;

  function $(id) { return document.getElementById(id); }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>]/g, function (m) {
      return m === '&' ? '&amp;' : (m === '<' ? '&lt;' : '&gt;');
    });
  }

  function scriptOk() {
    var u = window.YYRL_API && window.YYRL_API.scriptUrl();
    return u && u.indexOf('你的脚本ID') === -1;
  }

  function claimsOpen() { return cfg.CLAIMS_OPEN !== false; }

  function setupNav() {
    var menuBtn = $('menuToggle');
    var nav = $('topNav');
    if (!menuBtn || !nav) return;
    menuBtn.addEventListener('click', function () { nav.classList.toggle('is-open'); });
    nav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { nav.classList.remove('is-open'); });
    });
  }

  function showView(id) {
    ['view-closed', 'view-list', 'view-detail', 'view-thanks'].forEach(function (vid) {
      var el = $(vid);
      if (el) el.hidden = vid !== id;
    });
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }

  function applySiteConfig() {
    if (cfg.SITE_TITLE && $('siteTitle')) $('siteTitle').textContent = cfg.SITE_TITLE;
    if (cfg.SITE_TAGLINE && $('siteTagline')) $('siteTagline').textContent = cfg.SITE_TAGLINE;
    if (cfg.CLAIMS_CLOSED_MESSAGE && $('closedMessage')) $('closedMessage').textContent = cfg.CLAIMS_CLOSED_MESSAGE;
    var t = cfg.SITE_TITLE || '应援认领';
    if (cfg.SITE_TAGLINE) t += ' · ' + cfg.SITE_TAGLINE;
    document.title = t;
  }

  function clearErrors() {
    ['nonFieldErrors', 'err_name', 'err_contact', 'err_amount', 'err_screenshotFile', 'err_remark', 'err_customProject'].forEach(
      function (id) {
        var ul = $(id);
        if (!ul) return;
        ul.innerHTML = '';
        ul.hidden = true;
      }
    );
  }

  function showFieldError(field, messages) {
    var ul = $('err_' + field);
    if (!ul) return;
    ul.innerHTML = (messages || []).map(function (m) { return '<li>' + escapeHtml(m) + '</li>'; }).join('');
    ul.hidden = !(messages && messages.length);
  }

  function showNonField(messages) {
    var ul = $('nonFieldErrors');
    if (!ul) return;
    ul.innerHTML = (messages || []).map(function (m) { return '<li>' + escapeHtml(m) + '</li>'; }).join('');
    ul.hidden = !(messages && messages.length);
  }

  function validateForm() {
    clearErrors();
    var errors = {};
    if (!$('name').value.trim()) errors.name = ['请填写姓名/昵称。'];
    if (!$('contact').value.trim()) errors.contact = ['请填写联系方式。'];
    if (!$('amount').value || Number($('amount').value) <= 0) errors.amount = ['请填写有效的认领金额。'];
    var file = $('screenshotFile').files && $('screenshotFile').files[0];
    if (!file) errors.screenshotFile = ['请上传付款截图文件。'];
    else if (!/^image\//i.test(file.type)) errors.screenshotFile = ['仅支持图片文件。'];
    else if (file.size > 8 * 1024 * 1024) errors.screenshotFile = ['图片过大，请控制在 8MB 内。'];
    Object.keys(errors).forEach(function (k) { showFieldError(k, errors[k]); });
    if (Object.keys(errors).length) return false;
    var custom = ($('customProject').value || '').trim();
    var resolved = custom || (currentProject && currentProject.name) || '';
    if (!resolved) {
      showNonField(['请选择项目，或在「其他项目」中填写项目名称。']);
      return false;
    }
    return true;
  }

  function showListView() {
    currentProject = null;
    clearErrors();
    showView('view-list');
  }

  function gotoDetail(idx) {
    var p = projectsCache[idx];
    if (!p) return;
    currentProject = { name: p.name || '', target: p.target || '' };
    $('detailTitle').textContent = currentProject.name || '项目';
    $('detailDesc').textContent = currentProject.target || '请根据项目说明完成付款，并如实填写认领信息与付款凭证。';
    $('bcCurrent').textContent = currentProject.name || '项目详情';
    $('claimForm').reset();
    clearErrors();
    showView('view-detail');
  }

  function renderProjects(list) {
    var container = $('projectList');
    projectsCache = list && list.length ? list.slice() : [];
    if (!scriptOk()) {
      container.innerHTML = '<p class="card__lead" style="margin:0;color:#ba2121;">未配置脚本地址：请在 config.js 中填写 GOOGLE_SCRIPT_URL。</p>';
      return;
    }
    if (!projectsCache.length) {
      container.innerHTML = '<p class="card__lead" style="margin:0;">暂无上架应援项目，请稍后再试。</p>';
      return;
    }
    container.innerHTML = projectsCache.map(function (p, index) {
      return '<article class="project-card"><p class="project-card__name">' + escapeHtml(p.name || '') +
        '</p><p class="project-card__target">' + escapeHtml(p.target || '') +
        '</p><div class="project-card__actions"><button type="button" class="btn btn-primary" data-go="' + index + '">进入认领</button></div></article>';
    }).join('');
    container.querySelectorAll('button[data-go]').forEach(function (btn) {
      btn.addEventListener('click', function () { gotoDetail(Number(btn.getAttribute('data-go'))); });
    });
  }

  async function loadProjects() {
    var container = $('projectList');
    container.innerHTML = '<div class="skel"></div><div class="skel" style="margin-top:10px"></div><div class="skel" style="margin-top:10px"></div>';
    if (!scriptOk()) { renderProjects([]); return; }
    try {
      var data = await window.YYRL_API.fetchPublicProjects();
      if (data && data.error) {
        container.innerHTML = '<p class="card__lead" style="margin:0;color:#ba2121;">加载项目失败：' + escapeHtml(data.error) + '</p>';
      } else {
        renderProjects((data && data.projects) || []);
      }
    } catch (err) {
      container.innerHTML = '<p class="card__lead" style="margin:0;color:#ba2121;">加载项目失败：' + escapeHtml(err.message || String(err)) + '</p>';
    }
  }

  function readFileAsDataURL(file) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { resolve(fr.result); };
      fr.onerror = function () { reject(new Error('读取图片失败')); };
      fr.readAsDataURL(file);
    });
  }

  function compressImageToDataURL(file) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      var fr = new FileReader();
      fr.onload = function () { img.src = fr.result; };
      fr.onerror = function () { reject(new Error('读取图片失败')); };
      img.onload = function () {
        var maxSide = 1200;
        var w = img.width;
        var h = img.height;
        if (w > maxSide || h > maxSide) {
          var scale = Math.min(maxSide / w, maxSide / h);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
        }
        var cvs = document.createElement('canvas');
        cvs.width = w;
        cvs.height = h;
        var ctx = cvs.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(cvs.toDataURL('image/jpeg', 0.78));
      };
      img.onerror = function () { reject(new Error('图片格式不支持')); };
      fr.readAsDataURL(file);
    });
  }

  function bind() {
    $('btnBackToList').addEventListener('click', showListView);
    $('btnThanksAnother').addEventListener('click', function () { showListView(); loadProjects(); });

    $('claimForm').addEventListener('submit', async function (e) {
      e.preventDefault();
      if (!validateForm()) return;
      var custom = ($('customProject').value || '').trim();
      var projectName = custom || (currentProject && currentProject.name) || '';
      var url = window.YYRL_API && window.YYRL_API.scriptUrl();
      if (!url || url.indexOf('你的脚本ID') !== -1) {
        showNonField(['未配置脚本地址：请在 config.js 中填写 GOOGLE_SCRIPT_URL。']);
        return;
      }
      var btn = $('submitBtn');
      btn.disabled = true;
      btn.textContent = '提交中…';
      clearErrors();
      try {
        var file = $('screenshotFile').files[0];
        var screenshotData = await compressImageToDataURL(file);
        if (screenshotData.length > 900000) {
          // 太长时回退原图 dataURL，避免压缩失败导致空图
          screenshotData = await readFileAsDataURL(file);
        }
        var body = new URLSearchParams({
          action: 'claim',
          name: $('name').value.trim(),
          contact: $('contact').value.trim(),
          project: projectName,
          amount: $('amount').value,
          screenshot_data: screenshotData,
          screenshot_name: file.name || '',
          remark: ($('remark').value || '').trim()
        });
        await fetch(url, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
          body: body
        });
        $('claimForm').reset();
        showView('view-thanks');
      } catch (err) {
        console.error(err);
        showNonField(['提交失败，请检查网络后重试；若多次失败请联系工作人员。']);
      } finally {
        btn.disabled = false;
        btn.textContent = '提交认领登记';
      }
    });
  }

  function boot() {
    applySiteConfig();
    setupNav();
    bind();
    if (!claimsOpen()) { showView('view-closed'); return; }
    showView('view-list');
    loadProjects();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
