(function () {
  'use strict';

  var cfg = window.YYRL_CONFIG || {};
  var projectsCache = [];
  var currentProject = null;

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>]/g, function (m) {
      if (m === '&') return '&amp;';
      if (m === '<') return '&lt;';
      if (m === '>') return '&gt;';
      return m;
    });
  }

  function scriptOk() {
    var u = window.YYRL_API && window.YYRL_API.scriptUrl();
    return u && u.indexOf('你的脚本ID') === -1;
  }

  function claimsOpen() {
    return cfg.CLAIMS_OPEN !== false;
  }

  function showView(id) {
    ['view-closed', 'view-list', 'view-detail', 'view-thanks'].forEach(function (vid) {
      var el = $(vid);
      if (el) el.hidden = vid !== id;
    });
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }

  function applySiteConfig() {
    if (cfg.SITE_TITLE) $('siteTitle').textContent = cfg.SITE_TITLE;
    if (cfg.SITE_TAGLINE) $('siteTagline').textContent = cfg.SITE_TAGLINE;
    if (cfg.CLAIMS_CLOSED_MESSAGE) $('closedMessage').textContent = cfg.CLAIMS_CLOSED_MESSAGE;
    var t = cfg.SITE_TITLE || '认领登记';
    if (cfg.SITE_TAGLINE) t += ' · ' + cfg.SITE_TAGLINE;
    document.title = t;
  }

  function clearErrors() {
    ['nonFieldErrors', 'err_name', 'err_contact', 'err_amount', 'err_screenshotUrl', 'err_remark', 'err_customProject'].forEach(
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
    ul.innerHTML = (messages || [])
      .map(function (m) {
        return '<li>' + escapeHtml(m) + '</li>';
      })
      .join('');
    ul.hidden = !messages || !messages.length;
  }

  function showNonField(messages) {
    var ul = $('nonFieldErrors');
    if (!ul) return;
    ul.innerHTML = (messages || [])
      .map(function (m) {
        return '<li>' + escapeHtml(m) + '</li>';
      })
      .join('');
    ul.hidden = !messages || !messages.length;
  }

  function validateForm() {
    clearErrors();
    var errors = {};
    var name = $('name').value.trim();
    var contact = $('contact').value.trim();
    var amount = $('amount').value;
    var screenshotUrl = $('screenshotUrl').value.trim();

    if (!name) errors.name = ['请填写姓名/昵称。'];
    if (!contact) errors.contact = ['请填写联系方式。'];
    if (!amount || Number(amount) <= 0) errors.amount = ['请填写有效的认领金额。'];
    if (!screenshotUrl) errors.screenshotUrl = ['请填写付款截图链接。'];

    Object.keys(errors).forEach(function (k) {
      showFieldError(k, errors[k]);
    });
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
    $('detailDesc').textContent =
      currentProject.target || '请根据项目说明完成付款，并如实填写认领信息与付款凭证链接。';
    $('bcCurrent').textContent = currentProject.name || '项目详情';
    $('claimForm').reset();
    clearErrors();
    showView('view-detail');
  }

  function renderProjects(list) {
    var container = $('projectList');
    projectsCache = list && list.length ? list.slice() : [];

    if (!scriptOk()) {
      container.innerHTML =
        '<p class="card__lead" style="margin:0;color:#ba2121;">未配置脚本地址：请在 config.js 中填写 GOOGLE_SCRIPT_URL。</p>';
      return;
    }

    if (!projectsCache.length) {
      container.innerHTML =
        '<p class="card__lead" style="margin:0;">暂无上架应援项目。请稍后再试，或联系工作人员在后台「应援项目」表中维护。</p>';
      return;
    }

    container.innerHTML = projectsCache
      .map(function (p, index) {
        var name = p.name || '';
        var target = p.target || '';
        return (
          '<article class="project-card">' +
          '<p class="project-card__name">' +
          escapeHtml(name) +
          '</p>' +
          '<p class="project-card__target">' +
          escapeHtml(target) +
          '</p>' +
          '<div class="project-card__actions">' +
          '<button type="button" class="btn btn-primary" data-go="' +
          index +
          '">进入认领</button>' +
          '</div></article>'
        );
      })
      .join('');

    container.querySelectorAll('button[data-go]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var i = Number(btn.getAttribute('data-go'));
        gotoDetail(i);
      });
    });
  }

  async function loadProjects() {
    var container = $('projectList');
    container.innerHTML =
      '<div class="skel"></div><div class="skel" style="margin-top:10px"></div><div class="skel" style="margin-top:10px"></div>';

    if (!scriptOk()) {
      renderProjects([]);
      return;
    }

    try {
      var data = await window.YYRL_API.fetchPublicProjects();
      if (data && data.error) {
        container.innerHTML =
          '<p class="card__lead" style="margin:0;color:#ba2121;">加载项目失败：' + escapeHtml(data.error) + '</p>';
      } else {
        renderProjects((data && data.projects) || []);
      }
    } catch (err) {
      container.innerHTML =
        '<p class="card__lead" style="margin:0;color:#ba2121;">加载项目失败：' + escapeHtml(err.message || String(err)) + '</p>';
    }
  }

  function bind() {
    $('btnBackToList').addEventListener('click', showListView);
    $('btnThanksAnother').addEventListener('click', function () {
      showListView();
      loadProjects();
    });

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

      var body = new URLSearchParams({
        action: 'claim',
        name: $('name').value.trim(),
        contact: $('contact').value.trim(),
        project: projectName,
        amount: $('amount').value,
        screenshot: $('screenshotUrl').value.trim(),
        remark: ($('remark').value || '').trim()
      });

      try {
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
    bind();

    if (!claimsOpen()) {
      showView('view-closed');
      return;
    }

    showView('view-list');
    loadProjects();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
