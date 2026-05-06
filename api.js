/**
 * 与 Google Apps Script 通信：JSONP 读取、表单 POST 写入（no-cors）
 */
(function (global) {
  'use strict';

  function scriptUrl() {
    var c = global.YYRL_CONFIG;
    return (c && c.GOOGLE_SCRIPT_URL) || '';
  }

  function jsonp(url, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var cb = 'yyrl_cb_' + Date.now() + '_' + Math.floor(Math.random() * 1e9);
      var timer = setTimeout(function () {
        cleanup();
        reject(new Error('请求超时'));
      }, timeoutMs || 30000);
      function cleanup() {
        clearTimeout(timer);
        try {
          delete global[cb];
        } catch (e) {
          global[cb] = undefined;
        }
        if (script && script.parentNode) script.parentNode.removeChild(script);
      }
      global[cb] = function (data) {
        cleanup();
        resolve(data);
      };
      var script = document.createElement('script');
      script.onerror = function () {
        cleanup();
        reject(new Error('网络错误或脚本地址无效'));
      };
      var sep = url.indexOf('?') >= 0 ? '&' : '?';
      script.src = url + sep + 'callback=' + encodeURIComponent(cb);
      document.head.appendChild(script);
    });
  }

  function withParams(baseParams) {
    var u = scriptUrl();
    if (!u) return '';
    var parts = [];
    Object.keys(baseParams).forEach(function (k) {
      if (baseParams[k] === undefined || baseParams[k] === null) return;
      parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(String(baseParams[k])));
    });
    var q = parts.join('&');
    return u + (u.indexOf('?') >= 0 ? '&' : '?') + q;
  }

  function adminPost(fields) {
    var u = scriptUrl();
    var body = new URLSearchParams();
    Object.keys(fields).forEach(function (k) {
      body.set(k, fields[k] == null ? '' : String(fields[k]));
    });
    return fetch(u, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: body
    });
  }

  global.YYRL_API = {
    scriptUrl: scriptUrl,
    jsonp: jsonp,
    withParams: withParams,
    adminPost: adminPost,
    fetchPublicProjects: function () {
      return jsonp(withParams({ public: 'projects' }), 20000);
    },
    ping: function (key) {
      return jsonp(withParams({ key: key, ping: '1' }), 20000);
    },
    getClaims: function (key) {
      return jsonp(withParams({ key: key, list: 'claims' }), 35000);
    },
    getProjectsAdmin: function (key) {
      return jsonp(withParams({ key: key, list: 'projects' }), 35000);
    }
  };
})(window);
