/**
 * tiktok-unlock.js —— TikTok 解锁脚本（Stash 版）
 *
 * 作用：把 TikTok 请求里写死的「中国大陆」环境参数改写成目标地区，
 *       让老版本 / 未跟随节点地区刷新的客户端也能正常解锁，并跟随节点换区。
 *
 * 覆盖的参数：
 *   _region=CN / region=CN / region1=CN ……  ->  目标地区代码
 *   mcc_mnc=46xxxx（中国大陆运营商）        ->  目标地区 MCC+MNC
 *   carrier=（中国移动 / 联通 / 电信……）     ->  目标地区运营商名
 *   tz_name=Asia/Shanghai                   ->  目标地区时区名
 *   timezone=8                              ->  目标地区时区偏移
 *
 * 用法（Stash 配置 / 覆写）：
 *   http:
 *     script:
 *       - match: '^https?://(?:[^/]*\.)?(?:tiktokv|byteoversea|tik-tokapi)\.(?:com|us|eu)(?::\d+)?/'
 *         name: tiktok-unlock
 *         type: request
 *         argument: '{"region":"US"}'
 *   script-providers:
 *     tiktok-unlock:
 *       url: https://你的地址/tiktok-unlock.js
 *       interval: 86400
 *
 * 说明：只改 URL 里的参数，不碰请求体与响应，脚本执行极快，不会拖慢视频加载。
 */

/* ------------------------------------------------------------------ *
 * 各地区参数表（MCC+MNC、运营商名、时区名、时区偏移）
 * 数值只需「像当地」，TikTok 只用来判断地区，不校验真伪。
 * ------------------------------------------------------------------ */
const REGIONS = {
  US: { code: 'US', mccMnc: '310005', carrier: 'Verizon', tzName: 'America/New_York', tzOffset: '-4' },
  JP: { code: 'JP', mccMnc: '440010', carrier: 'NTT DOCOMO', tzName: 'Asia/Tokyo', tzOffset: '9' },
  KR: { code: 'KR', mccMnc: '450005', carrier: 'SK Telecom', tzName: 'Asia/Seoul', tzOffset: '9' },
  TW: { code: 'TW', mccMnc: '466092', carrier: 'Chunghwa Telecom', tzName: 'Asia/Taipei', tzOffset: '8' },
  HK: { code: 'HK', mccMnc: '454000', carrier: 'CSL', tzName: 'Asia/Hong_Kong', tzOffset: '8' },
  SG: { code: 'SG', mccMnc: '525001', carrier: 'Singtel', tzName: 'Asia/Singapore', tzOffset: '8' },
  MY: { code: 'MY', mccMnc: '502019', carrier: 'Celcom', tzName: 'Asia/Kuala_Lumpur', tzOffset: '8' },
  TH: { code: 'TH', mccMnc: '520001', carrier: 'AIS', tzName: 'Asia/Bangkok', tzOffset: '7' },
  VN: { code: 'VN', mccMnc: '452001', carrier: 'Viettel', tzName: 'Asia/Ho_Chi_Minh', tzOffset: '7' },
  PH: { code: 'PH', mccMnc: '515003', carrier: 'Smart', tzName: 'Asia/Manila', tzOffset: '8' },
  ID: { code: 'ID', mccMnc: '510010', carrier: 'Telkomsel', tzName: 'Asia/Jakarta', tzOffset: '7' },
  UK: { code: 'GB', mccMnc: '234015', carrier: 'Vodafone', tzName: 'Europe/London', tzOffset: '0' },
  DE: { code: 'DE', mccMnc: '262001', carrier: 'Telekom', tzName: 'Europe/Berlin', tzOffset: '2' },
  FR: { code: 'FR', mccMnc: '208001', carrier: 'Orange', tzName: 'Europe/Paris', tzOffset: '2' },
  ES: { code: 'ES', mccMnc: '214001', carrier: 'Vodafone', tzName: 'Europe/Madrid', tzOffset: '2' },
  IT: { code: 'IT', mccMnc: '222001', carrier: 'TIM', tzName: 'Europe/Rome', tzOffset: '2' },
  RU: { code: 'RU', mccMnc: '250001', carrier: 'MTS', tzName: 'Europe/Moscow', tzOffset: '3' },
  TR: { code: 'TR', mccMnc: '286001', carrier: 'Turkcell', tzName: 'Europe/Istanbul', tzOffset: '3' },
  BR: { code: 'BR', mccMnc: '724005', carrier: 'Claro', tzName: 'America/Sao_Paulo', tzOffset: '-3' },
  MX: { code: 'MX', mccMnc: '334020', carrier: 'Telcel', tzName: 'America/Mexico_City', tzOffset: '-6' },
  CA: { code: 'CA', mccMnc: '302720', carrier: 'Rogers', tzName: 'America/Toronto', tzOffset: '-4' },
  AU: { code: 'AU', mccMnc: '505001', carrier: 'Telstra', tzName: 'Australia/Sydney', tzOffset: '10' },
};

/* 参数缺省时使用的地区 */
const FALLBACK = REGIONS.US;

/**
 * 读取 Stash 传进来的 argument（字符串），返回目标地区参数。
 * argument 形如 '{"region":"JP"}'，也允许直接传 'JP'。
 */
function readRegion() {
  let raw = '';
  try {
    raw = typeof $argument === 'string' ? $argument.trim() : '';
  } catch (e) {
    raw = '';
  }

  let key = '';
  if (raw.charAt(0) === '{') {
    try {
      key = String(JSON.parse(raw).region || '');
    } catch (e) {
      key = '';
    }
  } else {
    key = raw;
  }

  key = key.replace(/["'\s]/g, '').toUpperCase();
  return REGIONS[key] || FALLBACK;
}

/**
 * 按目标地区改写 URL，返回改写后的 URL（未命中任何参数时保持原样）。
 */
function rewrite(url, region) {
  let out = url;

  // 1) 区域标识：_region=CN、region=CN、region1=CN……
  out = out.replace(/([?&])(_?region\d?)=CN(?=&|$)/gi, ($0, sep, name) => `${sep}${name}=${region.code}`);

  // 2) 运营商 MCC/MNC：4600–4699 属于中国大陆，整体换成目标地区
  out = out.replace(/([?&]mcc_mnc=)46\d{3,4}(?=&|$)/g, `$1${region.mccMnc}`);

  // 3) 运营商名称（客户端一般会做 URL 解码，直接给原始值）
  out = out.replace(/([?&]carrier=)[^&]*/g, `$1${encodeURIComponent(region.carrier)}`);

  // 4) 时区名：只替换中国大陆的 Asia/Shanghai，避免动到别的值
  out = out.replace(/([?&]tz_name=)Asia(?:%2F|\/)Shanghai(?=&|$)/gi, `$1${region.tzName}`);

  // 5) 时区偏移：只替换纯数字（8、+8、8.0 这类）
  out = out.replace(/([?&]timezone=)[-+]?\d+(?:\.\d+)?(?=&|$)/g, `$1${region.tzOffset}`);

  return out;
}

try {
  const original = $request.url;
  const region = readRegion();
  const url = rewrite(original, region);

  if (url !== original) {
    $done({ url });
  } else {
    $done({});
  }
} catch (e) {
  console.log('tiktok-unlock: ' + e);
  $done({});
}
