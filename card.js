// 金句卡片共用模組：風格、尺寸、卡片渲染（原型與上線模擬共用）
// 需先載入 qrcode.browser.js 與 logos.js
window.QuoteCard = (function () {
  const SERIF = "'Noto Serif TC','Songti TC','Songti SC','NSimSun',serif";
  const SANS  = "'PingFang TC','PingFang SC','Microsoft JhengHei','Noto Sans TC',sans-serif";

  // 風格（顏色取自 thematters/design-system token；名稱採中性色調命名）
  const STYLES = [
    {id:'warm',   name:'米金', sw:'#c0a46b', bg:'#faf7f0', quoteColor:'#333333', accent:'#c0a46b', sub:'#c58463', font:SERIF, qrDark:'#c0a46b', qrLight:'#faf7f0'},
    {id:'light',  name:'天藍', sw:'#85d8ff', bg:'#F0F9FE', quoteColor:'#045898', accent:'#1999D0', sub:'#1999D0', font:SANS, weight:300, airy:true, qrDark:'#1999D0', qrLight:'#F0F9FE'},
    {id:'playful',name:'珊瑚', sw:'#dc7871', bg:'#ffe8e8', quoteColor:'#333333', accent:'#dc7871', sub:'#d577aa', font:SANS, weight:600, qrDark:'#dc7871', qrLight:'#ffe8e8'},
    {id:'heavy',  name:'墨黑', sw:'#000000', bg:'#000000', quoteColor:'#ffffff', accent:'#c0a46b', sub:'#c0a46b', font:SERIF, wide:true, qrDark:'#c0a46b', qrLight:'#000000', logo:'white'},
    {id:'lyrical',name:'松綠', sw:'#0d6763', bg:'#0d6763', quoteColor:'#faf7f0', accent:'#40bfa5', sub:'#a9d9cf', font:SERIF, qrDark:'#faf7f0', qrLight:'#0d6763', logo:'white'},
    {id:'healing',name:'薄荷', sw:'#70b388', bg:'linear-gradient(160deg,#f2faf7 0%,#f2fbd9 100%)', quoteColor:'#246802', accent:'#70b388', sub:'#70b388', font:SERIF, qrDark:'#246802', qrLight:'#f7fbef'},
  ];

  // 尺寸（含適合平台備註）
  const SIZES = [
    {id:'square',   name:'正方形 1:1',    note:'IG／FB 貼文', w:1080, h:1080},
    {id:'portrait', name:'直式 4:5',      note:'IG 貼文・最吸睛', w:1080, h:1350},
    {id:'story',    name:'限時動態 9:16', note:'IG／FB 限動・Threads', w:1080, h:1920},
  ];

  const MAX_QUOTE_LEN = 80; // 金句字數上限（超過自動截斷）

  // 依字數自動縮放字級，確保長句也能塞進安全區、不壓到頁尾
  function fitFont(len, airy) {
    if (len <= 16) return airy ? 72 : 78;
    if (len <= 30) return airy ? 60 : 66;
    if (len <= 48) return 56;
    if (len <= 64) return 48;
    return 42;
  }

  function clampQuote(q) {
    q = (q || '').trim().replace(/\s+/g, ' ');
    if (q.length > MAX_QUOTE_LEN) return { text: q.slice(0, MAX_QUOTE_LEN) + '…', truncated: true, original: q.length };
    return { text: q, truncated: false, original: q.length };
  }

  function esc(s) { return (s || '').replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }

  async function makeQR(url, s) {
    try { return await QRCode.toDataURL(url || ' ', { margin:0, width:300, color:{ dark:s.qrDark, light:s.qrLight } }); }
    catch (e) { return ''; }
  }

  // 注入一次卡片樣式（scoped 於 .qc）
  function ensureCss() {
    if (document.getElementById('quotecard-css')) return;
    const css = `
      .qc{position:relative;overflow:hidden;display:block}
      .qc .inner{position:absolute;top:118px;left:110px;right:110px;bottom:300px;
                 display:flex;flex-direction:column;justify-content:center;overflow:hidden}
      .qc .mark{font-size:120px;line-height:.6;margin-bottom:18px;font-family:${SERIF};opacity:.9}
      .qc .rule{width:80px;height:2px;margin:46px 0 24px}
      .qc .author{font-size:40px;font-weight:600}
      .qc .author .dash{opacity:.7;margin-right:14px}
      .qc .foot{position:absolute;left:110px;right:110px;bottom:90px;
                display:flex;align-items:flex-end;justify-content:space-between;gap:32px}
      .qc .title{font-size:30px;line-height:1.5;max-width:640px;font-family:${SANS};opacity:.95;
                 display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
      .qc .title .label{display:block;font-size:22px;letter-spacing:.2em;opacity:.6;margin-bottom:10px;
                 -webkit-line-clamp:none}
      .qc .brand{font-size:24px;opacity:.7;font-family:${SANS};margin-top:14px}
      .qc .brandLogo{margin-top:16px}
      .qc .brandLogo svg{height:60px;width:auto;display:block}
      .qc .qr{width:150px;height:150px;border-radius:14px;padding:12px;flex:0 0 auto;
              box-shadow:0 4px 16px rgba(0,0,0,.12)}
      .qc .qr img{width:100%;height:100%;display:block}`;
    const el = document.createElement('style');
    el.id = 'quotecard-css';
    el.textContent = css;
    document.head.appendChild(el);
  }

  // 渲染卡片到指定元素（元素需有 class "qc"）
  // opts: { quote, author, title, url, style, size, isSevenDay }
  // 回傳 { truncated, original } 供呼叫端顯示提示
  async function render(card, opts) {
    ensureCss();
    const s = opts.style, sz = opts.size;
    const q = clampQuote(opts.quote);
    const qr = await makeQR(opts.url, s);
    const ls = s.wide ? '0.06em' : (s.font === SERIF ? '0.02em' : 'normal');
    const lh = s.airy ? 1.8 : 1.65;
    const qs = fitFont(q.text.length, s.airy);
    const brand = opts.isSevenDay
      ? `<div class="brandLogo">${window.SEVEN_DAY_LOGO[s.logo === 'white' ? 'white' : 'dark']}</div>`
      : `<div class="brand" style="color:${s.sub}">Matters · matters.town</div>`;

    card.classList.add('qc');
    card.style.cssText = `width:${sz.w}px;height:${sz.h}px;background:${s.bg};font-family:${s.font}`;
    card.innerHTML = `
      <div class="inner">
        <div class="mark" style="color:${s.accent}">“</div>
        <div class="quote" style="font-size:${qs}px;line-height:${lh};color:${s.quoteColor};font-weight:${s.weight||400};letter-spacing:${ls}">${esc(q.text)}</div>
        ${s.rule ? `<div class="rule" style="background:${s.accent}"></div>` : ''}
        <div class="author" style="color:${s.accent};${s.rule?'':'margin-top:44px'}"><span class="dash">—</span>${esc(opts.author)}</div>
      </div>
      <div class="foot">
        <div>
          <div class="title" style="color:${s.sub}"><span class="label">原文</span>${esc(opts.title)}</div>
          ${brand}
        </div>
        <div class="qr" style="background:${s.qrLight}"><img src="${qr}"></div>
      </div>`;
    return { truncated: q.truncated, original: q.original };
  }

  async function toJpeg(card, sz) {
    return await htmlToImage.toJpeg(card, { quality:0.95, pixelRatio:2, width:sz.w, height:sz.h, style:{ transform:'none' } });
  }

  return { STYLES, SIZES, MAX_QUOTE_LEN, fitFont, clampQuote, esc, makeQR, render, toJpeg };
})();
