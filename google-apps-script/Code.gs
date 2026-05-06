/**
 * 与「同一表格文件」绑定：扩展程序 → Apps Script → 粘贴
 * 部署 → 网络应用：执行身份「我」，访问「任何人」
 *
 * 工作表约定：
 * 1) 第一个工作表（左起第一张）：认领数据
 *    建议表头：时间戳 | 姓名/昵称 | 联系方式 | 认领项目 | 认领金额 | 付款凭证 | 备注 | 状态
 * 2) 工作表「应援项目」：由脚本自动创建；列：名称 | 目标说明 | 排序 | 启用（1/0 或 是/否）
 */

var ADMIN_KEY = 'yyrl2026MySecret!abc';
var PROJECTS_SHEET_NAME = '应援项目';
var SITE_SHEET_NAME = '站点配置';

function getSpreadsheet_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getClaimsSheet_() {
  return getSpreadsheet_().getSheets()[0];
}

function ensureProjectsSheet_() {
  var ss = getSpreadsheet_();
  var sh = ss.getSheetByName(PROJECTS_SHEET_NAME);
  if (sh) return sh;
  sh = ss.insertSheet(PROJECTS_SHEET_NAME);
  sh.appendRow(['名称', '目标说明', '排序', '启用']);
  sh.appendRow(['🌸 生日应援礼包', '目标: ¥3,000', 1, 1]);
  sh.appendRow(['🎬 新剧应援餐车', '目标: ¥5,000', 2, 1]);
  sh.appendRow(['📸 杂志代购团', '目标: ¥2,000', 3, 1]);
  sh.appendRow(['🎁 粉丝周边礼包', '目标: ¥1,500', 4, 1]);
  sh.appendRow(['💝 公益捐助计划', '目标: ¥2,500', 5, 1]);
  return sh;
}

function ensureSiteSheet_() {
  var ss = getSpreadsheet_();
  var sh = ss.getSheetByName(SITE_SHEET_NAME);
  if (sh) return sh;
  sh = ss.insertSheet(SITE_SHEET_NAME);
  sh.appendRow(['key', 'value']);
  sh.appendRow(['hero_kicker', 'TIAN · STARLIGHT SUPPORT']);
  sh.appendRow(['hero_title', '添_星辉 | 陈添祥']);
  sh.appendRow(['hero_desc', '以爱为名，记录每一份支持。欢迎进入站子主页，查看应援计划、参与认领、关注最新站务动态。']);
  sh.appendRow(['feature_title', '本期主推']);
  sh.appendRow(['feature_desc', '生日应援 / 线下应援 / 应援物料筹备中']);
  sh.appendRow(['claim_title', '应援认领']);
  sh.appendRow(['claim_desc', '这是站子当前最重要入口。进入后可选择项目、填写认领信息并提交付款凭证，数据将自动汇总到后台表格。']);
  sh.appendRow(['news_1', '【置顶】认领提报与核验规则说明']);
  sh.appendRow(['news_2', '【更新】生日应援物料打样中']);
  sh.appendRow(['news_3', '【预告】线下活动签到与打卡安排']);
  return sh;
}

function adminKeyOk_(key) {
  return key && key === ADMIN_KEY;
}

function isTruthyActive_(v) {
  if (v === true || v === 1) return true;
  var s = String(v == null ? '' : v).trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'y' || s === 'yes' || s === '是' || s === '启用';
}

function getPublicProjects_() {
  var ss = getSpreadsheet_();
  var sh = ss.getSheetByName(PROJECTS_SHEET_NAME);
  if (!sh) return [];
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  var out = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    if (!isTruthyActive_(row[3])) continue;
    out.push({
      name: String(row[0] == null ? '' : row[0]),
      target: String(row[1] == null ? '' : row[1]),
      order: Number(row[2]) || 0
    });
  }
  out.sort(function (a, b) {
    return a.order - b.order;
  });
  return out;
}

function getSiteConfig_() {
  var sh = ensureSiteSheet_();
  var values = sh.getDataRange().getValues();
  var out = {};
  for (var i = 1; i < values.length; i++) {
    var k = String(values[i][0] == null ? '' : values[i][0]).trim();
    if (!k) continue;
    out[k] = String(values[i][1] == null ? '' : values[i][1]);
  }
  return out;
}

function getClaimsPayload_() {
  var sheet = getClaimsSheet_();
  var values = sheet.getDataRange().getValues();
  if (!values.length) {
    return { headers: [], rows: [], sheetRows: [] };
  }
  var headers = values[0];
  var rows = [];
  var sheetRows = [];
  for (var i = 1; i < values.length; i++) {
    rows.push(values[i]);
    sheetRows.push(i + 1);
  }
  return { headers: headers, rows: rows, sheetRows: sheetRows };
}

function getProjectsAdminPayload_() {
  var sh = ensureProjectsSheet_();
  var values = sh.getDataRange().getValues();
  if (!values.length) {
    return { headers: ['名称', '目标说明', '排序', '启用'], rows: [], sheetRows: [] };
  }
  var headers = values[0];
  var rows = [];
  var sheetRows = [];
  for (var i = 1; i < values.length; i++) {
    rows.push(values[i]);
    sheetRows.push(i + 1);
  }
  return { headers: headers, rows: rows, sheetRows: sheetRows };
}

function jsonpResponse_(callbackName, obj) {
  return ContentService.createTextOutput(callbackName + '(' + JSON.stringify(obj) + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function doGet(e) {
  var p = (e && e.parameter) ? e.parameter : {};
  var cb = p.callback;
  if (!cb || !/^[_a-zA-Z][_$a-zA-Z0-9]*$/.test(cb)) {
    return ContentService.createTextOutput('jsonpCallback({"error":"bad_callback"});')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  if (p.public === 'projects') {
    try {
      return jsonpResponse_(cb, { projects: getPublicProjects_() });
    } catch (err) {
      return jsonpResponse_(cb, { error: String(err.message || err) });
    }
  }
  if (p.public === 'site') {
    try {
      return jsonpResponse_(cb, { site: getSiteConfig_() });
    } catch (errSite) {
      return jsonpResponse_(cb, { error: String(errSite.message || errSite) });
    }
  }

  if (p.ping === '1') {
    if (!adminKeyOk_(p.key || '')) {
      return jsonpResponse_(cb, { error: 'unauthorized' });
    }
    return jsonpResponse_(cb, { ok: true });
  }

  if (!adminKeyOk_(p.key || '')) {
    return jsonpResponse_(cb, { error: 'unauthorized' });
  }

  try {
    if (p.list === 'projects') {
      var pp = getProjectsAdminPayload_();
      pp.list = 'projects';
      return jsonpResponse_(cb, pp);
    }
    if (p.list === 'site') {
      return jsonpResponse_(cb, { list: 'site', site: getSiteConfig_() });
    }
    var cp = getClaimsPayload_();
    cp.list = 'claims';
    return jsonpResponse_(cb, cp);
  } catch (err2) {
    return jsonpResponse_(cb, { error: String(err2.message || err2) });
  }
}

function appendClaim_(data) {
  var sheet = getClaimsSheet_();
  var screenshot = data.screenshot_data || data.screenshot || '';
  if (screenshot && String(screenshot).length > 2000000) {
    screenshot = String(screenshot).slice(0, 2000000);
  }
  var remark = data.remark || '';
  if (data.screenshot_name) {
    remark = (remark ? remark + ' | ' : '') + '文件:' + data.screenshot_name;
  }
  sheet.appendRow([
    new Date(),
    data.name || '',
    data.contact || '',
    data.project || '',
    data.amount || '',
    screenshot,
    remark,
    '待确认'
  ]);
}

function doPost(e) {
  var p = (e && e.parameter) ? e.parameter : {};
  var action = String(p.action || 'claim').toLowerCase();
  try {
    if (action === 'claim') {
      appendClaim_(p);
      return ContentService.createTextOutput('OK');
    }
    if (!adminKeyOk_(p.key || '')) {
      return ContentService.createTextOutput('UNAUTHORIZED');
    }

    if (action === 'update_claim') {
      var rowC = parseInt(p.row, 10);
      var valsC = JSON.parse(p.values || '[]');
      if (rowC < 2 || !valsC.length) throw new Error('bad_row_or_values');
      var shC = getClaimsSheet_();
      var nC = shC.getLastColumn();
      if (valsC.length < nC) {
        while (valsC.length < nC) valsC.push('');
      }
      if (valsC.length > nC) valsC = valsC.slice(0, nC);
      shC.getRange(rowC, 1, 1, nC).setValues([valsC]);
      return ContentService.createTextOutput('OK');
    }

    if (action === 'delete_claim') {
      var rowD = parseInt(p.row, 10);
      if (rowD < 2) throw new Error('bad_row');
      getClaimsSheet_().deleteRow(rowD);
      return ContentService.createTextOutput('OK');
    }

    if (action === 'append_claim_admin') {
      var valsA = JSON.parse(p.values || '[]');
      var shA = getClaimsSheet_();
      var nA = shA.getLastColumn();
      if (!valsA.length) throw new Error('empty_values');
      while (valsA.length < nA) valsA.push('');
      if (valsA.length > nA) valsA = valsA.slice(0, nA);
      shA.appendRow(valsA);
      return ContentService.createTextOutput('OK');
    }

    if (action === 'project_upsert') {
      var shP = ensureProjectsSheet_();
      var name = p.name != null ? String(p.name) : '';
      var target = p.target != null ? String(p.target) : '';
      var ord = p.order != null ? String(p.order) : '0';
      var active = p.active != null ? String(p.active) : '1';
      var rowP = parseInt(p.row || '0', 10);
      if (rowP >= 2) {
        shP.getRange(rowP, 1, 1, 4).setValues([[name, target, ord, active]]);
      } else {
        shP.appendRow([name, target, ord, active]);
      }
      return ContentService.createTextOutput('OK');
    }

    if (action === 'project_delete') {
      var rowDel = parseInt(p.row, 10);
      if (rowDel < 2) throw new Error('bad_row');
      var shDel = ensureProjectsSheet_();
      if (rowDel > shDel.getLastRow()) throw new Error('row_oob');
      shDel.deleteRow(rowDel);
      return ContentService.createTextOutput('OK');
    }

    if (action === 'site_update') {
      var values = JSON.parse(p.values || '{}');
      var shS = ensureSiteSheet_();
      var rows = shS.getDataRange().getValues();
      var rowMap = {};
      for (var i = 1; i < rows.length; i++) {
        rowMap[String(rows[i][0] || '')] = i + 1;
      }
      for (var key in values) {
        if (!values.hasOwnProperty(key)) continue;
        var v = values[key] != null ? String(values[key]) : '';
        if (rowMap[key]) {
          shS.getRange(rowMap[key], 2).setValue(v);
        } else {
          shS.appendRow([key, v]);
        }
      }
      return ContentService.createTextOutput('OK');
    }

    return ContentService.createTextOutput('BAD_ACTION');
  } catch (err) {
    return ContentService.createTextOutput('ERR: ' + (err.message || err));
  }
}
