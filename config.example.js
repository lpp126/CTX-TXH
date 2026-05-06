/**
 * 复制本文件为 config.js 后填写脚本地址（与 Google Apps Script 部署 URL 一致）
 * 管理密钥只写在 Google Apps Script 里，不要写进本文件
 * GitHub Pages 需上传：index.html、admin.html、config.js、assets/ 目录
 */
window.YYRL_CONFIG = {
  GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/你的脚本ID/exec',
  SITE_TITLE: '添_星辉应援认领',
  SITE_TAGLINE: '添_星辉',
  /** 设为 false 时认领页展示「认领已关闭」 */
  CLAIMS_OPEN: true,
  /** 关闭认领时显示的说明文案 */
  CLAIMS_CLOSED_MESSAGE: '当前认领通道已暂时关闭，请关注后续公告。'
};
