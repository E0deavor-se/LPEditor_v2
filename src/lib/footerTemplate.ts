type AssetRecord = {
  id: string;
  filename: string;
  data: string;
};

type AssetMap = Record<string, AssetRecord>;

type FooterAssets = Record<string, string | undefined>;

export const FOOTER_ASSET_KEYS = [
  "conditionsTitle",
  "conditionsText",
  "bannerHeadTitle",
  "bannerMain",
  "bannerMore",
  "magazineBanner",
  "footerLogo",
  "appStore",
  "googlePlay",
] as const;

export const FOOTER_BG_KEYS = [
  "conditionsBg1",
  "conditionsBg2",
  "conditionsBg3",
  "conditionsBg4",
  "bannerBg",
  "iconExclamation",
  "iconArrow",
  "iconArrowRight",
] as const;

const FOOTER_DEFAULT_BASE_PATH = "/footer-defaults";

const FOOTER_DEFAULT_FILENAMES: Record<string, string> = {
  conditionsTitle: "title-conditions.png",
  conditionsText: "text-conditions.png",
  bannerHeadTitle: "title-ponta.png",
  bannerMain: "banner.png",
  bannerMore: "banner-more.png",
  magazineBanner: "banner-magazine.png",
  appStore: "app-appstore.png",
  googlePlay: "app-googleplay.png",
  iconArrow: "icon-arrow.svg",
  iconArrowRight: "icon-arrow-right.png",
  iconExclamation: "icon-exclamation.svg",
  bannerBg: "bg-banner.png",
};

const toDefaultAssetPath = (key: string) => {
  const filename = FOOTER_DEFAULT_FILENAMES[key] ?? `${key}.png`;
  return `${FOOTER_DEFAULT_BASE_PATH}/${filename}`;
};

export const FOOTER_DEFAULT_ASSET_PATHS: Record<string, string> = {
  ...Object.fromEntries(FOOTER_ASSET_KEYS.map((key) => [key, toDefaultAssetPath(key)])),
  ...Object.fromEntries(FOOTER_BG_KEYS.map((key) => [key, toDefaultAssetPath(key)])),
};

const FOOTER_TEMPLATE_CSS = `
.lp-contact-footer {
  color: #000000;
  font-family: "Noto Sans JP", "Noto Sans CJK JP", "Hiragino Kaku Gothic ProN", "Hiragino Kaku Gothic Pro", "Hiragino Sans", "YuGothic", "Yu Gothic", sans-serif;
  line-height: 1.5;
}
.lp-contact-footer *,
.lp-contact-footer *::before,
.lp-contact-footer *::after {
  box-sizing: border-box;
}
.lp-contact-footer img {
  max-width: 100%;
  height: auto;
  vertical-align: bottom;
  display: block;
}
.lp-contact-footer a {
  color: inherit;
  text-decoration: none;
  transition: opacity 0.15s ease-out;
}
.lp-contact-footer a:hover {
  opacity: 0.7;
}
.lp-contact-footer ._view-md-high {
  display: none;
}
@media (min-width: 768px) {
  .lp-contact-footer ._view-md-high {
    display: inline;
  }
  .lp-contact-footer ._view-md-low {
    display: none;
  }
}

.lp-contact-footer .l-page-contents {
  max-width: 1012px;
  margin-left: auto;
  margin-right: auto;
  position: relative;
  padding: 0 2.5rem;
}
@media (max-width: 767px) {
  .lp-contact-footer .l-page-contents {
    padding: 0 1.25rem;
  }
}

.lp-contact-footer .c-button {
  display: inline-block;
  background: #FA5902;
  color: #fff;
  width: 23.75rem;
  max-width: 100%;
  font-size: 1.25rem;
  font-weight: bold;
  border-radius: 6.25rem;
  position: relative;
  padding: 1rem 2.25rem;
  text-align: center;
}
.lp-contact-footer .c-button::before {
  position: absolute;
  display: inline-block;
  box-sizing: border-box;
  width: 0.5625rem;
  height: 1rem;
  background: currentColor;
  content: "";
  -webkit-mask-image: var(--icon-arrow, none);
  mask-image: var(--icon-arrow, none);
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: 50%;
  mask-position: 50%;
  -webkit-mask-size: contain;
  mask-size: contain;
  top: 50%;
  transform: translateY(-50%);
  right: 1.625rem;
}
.lp-contact-footer .c-button.-black {
  background: #000000;
}
@media (max-width: 767px) {
  .lp-contact-footer .c-button {
    font-size: 1rem;
    width: 20rem;
  }
}

.lp-contact-footer .c-button-c {
  display: inline-block;
  background: #C30E23;
  color: #fff;
  max-width: 100%;
  font-size: 1.4375rem;
  font-weight: bold;
  position: relative;
  padding: 0.9375rem 5.125rem 1.0625rem 4.75rem;
  line-height: 1.5;
  text-align: center;
  border-radius: 6.25rem;
}
.lp-contact-footer .c-button-c::before {
  position: absolute;
  content: "";
  display: inline-block;
  box-sizing: border-box;
  width: 1.875rem;
  height: 1.875rem;
  top: 50%;
  transform: translateY(-50%);
  right: 1.375rem;
  background: var(--icon-arrow-right, none) no-repeat center center/contain;
}
.lp-contact-footer .c-button-c.-border {
  border: 0.1875rem solid #EDCB7D;
}
@media (max-width: 767px) {
  .lp-contact-footer .c-button-c {
    font-size: 1rem;
    padding: 0.625rem 3.25rem 0.75rem 2.875rem;
  }
  .lp-contact-footer .c-button-c::before {
    width: 1.25rem;
    height: 1.25rem;
    right: 1rem;
  }
}

.lp-contact-footer .c-list {
  list-style: none;
  margin: 0.5rem 0;
  padding: 0;
}
.lp-contact-footer .c-list > li {
  position: relative;
  padding-left: 0.875rem;
  line-height: 1.7;
}
.lp-contact-footer .c-list > li + li {
  margin-top: 0.5rem;
}
.lp-contact-footer .c-list > li::before {
  content: "";
  position: absolute;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 0.5rem;
  background: #C30E23;
  left: 0;
  top: calc(0.85em - 0.25rem);
}
.lp-contact-footer .c-list.-sm > li {
  font-size: 0.9375rem;
}
.lp-contact-footer .c-list.-sm > li + li {
  margin-top: 0.25rem;
}
.lp-contact-footer .c-list.-au > li::before {
  background: #FA5902;
}
@media (max-width: 767px) {
  .lp-contact-footer .c-list.-sm > li {
    font-size: 0.875rem;
  }
}

.lp-contact-footer .conditions {
  position: relative;
  padding: 6.25rem 0;
  background:
    var(--conditions-bg1, none) no-repeat top left/22.8125rem 41.25rem,
    var(--conditions-bg2, none) no-repeat top right/19.25rem 26.0625rem,
    var(--conditions-bg3, none) no-repeat bottom right/18rem 25.375rem,
    var(--conditions-bg4, none) no-repeat bottom left/24.625rem 16.25rem;
}
.lp-contact-footer .conditions__title {
  margin: 0 auto;
  max-width: 25.625rem;
  width: 90%;
}
.lp-contact-footer .conditions__text {
  margin: 3.25rem auto 0;
  width: 39.625rem;
  max-width: 100%;
  display: block;
}
.lp-contact-footer .conditions__model {
  margin-top: 1.5rem;
  font-weight: bold;
  text-align: center;
}
.lp-contact-footer .conditions__button {
  margin-top: 3.125rem;
  text-align: center;
}
@media (max-width: 767px) {
  .lp-contact-footer .conditions {
    padding: 3.125rem 0 3.75rem;
    background:
      var(--conditions-bg1, none) no-repeat top left/7.6042rem 13.75rem,
      var(--conditions-bg2, none) no-repeat top right/6.4167rem 8.6875rem,
      var(--conditions-bg3, none) no-repeat bottom right/6rem 8.4583rem,
      var(--conditions-bg4, none) no-repeat bottom left/8.2083rem 5.4167rem;
  }
  .lp-contact-footer .conditions__title {
    max-width: 17.5rem;
  }
  .lp-contact-footer .conditions__text {
    margin-top: 1.5rem;
  }
  .lp-contact-footer .conditions__model {
    font-size: 0.875rem;
    text-align: left;
    line-height: 1.6;
  }
  .lp-contact-footer .conditions__button {
    margin-top: 1.875rem;
  }
}

.lp-contact-footer .conditionsNotesBox {
  margin: 1.875rem auto 0;
  max-width: 52.5rem;
  box-sizing: border-box;
  border: solid 0.5rem #EBEBEB;
  padding: 1.5rem 2.5rem;
  border-radius: 1.25rem;
  background: #ffffff;
}
.lp-contact-footer .conditionsNotesBox__title {
  font-weight: bold;
  font-size: 1.1875rem;
  padding-left: 1.9375rem;
  position: relative;
  letter-spacing: 0.05em;
}
.lp-contact-footer .conditionsNotesBox__title::before {
  position: absolute;
  content: "";
  background: var(--icon-exclamation, none) center center no-repeat;
  background-size: contain;
  width: 1.625rem;
  height: 1.4375rem;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
}
.lp-contact-footer .conditionsNotesBox__notes {
  margin-top: 0.5rem;
  padding-bottom: 1.5rem;
  margin-bottom: 1.25rem;
  position: relative;
}
.lp-contact-footer .conditionsNotesBox__notes::before {
  position: absolute;
  content: "";
  width: 100%;
  height: 0.125rem;
  left: 0;
  bottom: 0;
  background-color: #ffffff;
  background-image: radial-gradient(circle, #333333 0.0625rem, transparent 0.0625rem);
  background-position: center;
  background-size: 0.4375rem 0.4375rem;
}
.lp-contact-footer .conditionsNotesBox__note {
  padding-left: 1.25rem;
  position: relative;
}
.lp-contact-footer .conditionsNotesBox__note::before {
  position: absolute;
  content: "※";
  color: #E8380D;
  left: 0;
  top: 0;
}
.lp-contact-footer .conditionsNotesBox__note + .conditionsNotesBox__note {
  margin-top: 0.25rem;
}
@media (max-width: 767px) {
  .lp-contact-footer .conditionsNotesBox {
    padding: 1.25rem;
    border-width: 0.375rem;
    border-radius: 1rem;
  }
  .lp-contact-footer .conditionsNotesBox__title {
    font-size: 1.0625rem;
  }
  .lp-contact-footer .conditionsNotesBox__note {
    font-size: 0.9375rem;
  }
}

.lp-contact-footer .contact {
  background: #000000;
  padding: 2.8125rem 0 3.125rem;
  text-align: center;
}
.lp-contact-footer .contact__title {
  text-align: center;
  color: #ffffff;
  font-weight: bold;
  font-size: 1.875rem;
}
.lp-contact-footer .contact__lead {
  color: #ffffff;
  font-weight: 400;
  margin-top: 1.25rem;
}
.lp-contact-footer .contact__wrap {
  display: flex;
  justify-content: center;
  margin-top: 2.5rem;
  column-gap: 4.25rem;
  list-style: none;
  padding: 0;
}
.lp-contact-footer .contact__item {
  width: 23.75rem;
  max-width: calc(50% - 2.125rem);
  display: flex;
  flex-direction: column;
  align-items: center;
}
.lp-contact-footer .contact__text {
  margin-top: 1.5rem;
  line-height: 2;
  font-weight: 400;
  color: #ffffff;
  font-size: 0.9375rem;
  text-align: left;
}
@media (max-width: 767px) {
  .lp-contact-footer .contact {
    padding: 2.5rem 0;
  }
  .lp-contact-footer .contact__title {
    font-size: 1.25rem;
  }
  .lp-contact-footer .contact__lead {
    font-size: 0.8125rem;
  }
  .lp-contact-footer .contact__wrap {
    flex-direction: column;
    row-gap: 1.875rem;
    margin-top: 1.875rem;
    align-items: center;
  }
  .lp-contact-footer .contact__item {
    width: 100%;
    max-width: none;
  }
  .lp-contact-footer .contact__text {
    font-size: 0.8125rem;
    text-align: center;
    margin-top: 1rem;
    line-height: 1.7;
  }
}

.lp-contact-footer .banner-head {
  padding: 1.625rem 1.25rem 1.5rem;
}
.lp-contact-footer .banner-head__text {
  max-width: 46.625rem;
  margin: 0 auto;
}
@media (max-width: 767px) {
  .lp-contact-footer .banner-head {
    padding: 1rem 0.5rem 0.875rem;
  }
}

.lp-contact-footer .banner {
  display: block;
  background: var(--banner-bg, none) repeat-x top center, #FFF055;
  background-size: 65.875rem auto;
  text-align: center;
  transition: 0.3s;
}
.lp-contact-footer .banner__main {
  padding: 2.5rem 1.25rem 1.875rem;
  max-width: 62.75rem;
  margin: 0 auto;
}
.lp-contact-footer .banner__more {
  background: #ffffff;
  padding: 1.625rem 1.25rem 1.5rem;
}
.lp-contact-footer .banner__moreText {
  max-width: 57.9375rem;
  margin: 0 auto;
}
@media (max-width: 767px) {
  .lp-contact-footer .banner {
    background-size: cover;
  }
  .lp-contact-footer .banner__main {
    padding: 1.25rem 0;
  }
  .lp-contact-footer .banner__more {
    padding: 1rem 0.75rem;
  }
}

.lp-contact-footer .magazine {
  background: #DF5510;
}
.lp-contact-footer .magazine__btn {
  display: block;
  margin: 0 auto;
  max-width: 85.375rem;
}

.lp-contact-footer .fixed-btn {
  display: none;
  position: fixed;
  left: 0;
  bottom: 0;
  padding: 12px 20px;
  box-sizing: border-box;
  background: rgba(64, 33, 16, 0.85);
  text-align: center;
  width: 100%;
  z-index: 9999;
}
.lp-contact-footer .fixed-btn__note {
  color: #fff;
  font-size: 0.875rem;
  line-height: 1.5;
  font-weight: bold;
  margin-bottom: 0.5rem;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
}

.lp-contact-footer .footer-menu {
  text-align: center;
  padding: 1.875rem 0;
  background: rgba(0, 11, 54, 0.1);
}
.lp-contact-footer .footer-menu__links {
  display: flex;
  justify-content: center;
  column-gap: 4.375rem;
  list-style: none;
  padding: 0;
}
.lp-contact-footer .footer-menu__link {
  color: #000b36;
  display: inline-block;
  padding-right: 0.875rem;
  position: relative;
  font-size: 0.9375rem;
}
.lp-contact-footer .footer-menu__link::before {
  position: absolute;
  display: inline-block;
  box-sizing: border-box;
  width: 0.375rem;
  height: 0.6875rem;
  background: currentColor;
  content: "";
  -webkit-mask-image: var(--icon-arrow, none);
  mask-image: var(--icon-arrow, none);
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: 50%;
  mask-position: 50%;
  -webkit-mask-size: contain;
  mask-size: contain;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
}
.lp-contact-footer .footer-menu__copyright {
  font-size: 0.75rem;
  margin-top: 1.875rem;
  font-weight: 400;
  display: block;
}
@media (max-width: 767px) {
  .lp-contact-footer .footer-menu__links {
    flex-direction: column;
    row-gap: 0.875rem;
    align-items: center;
  }
  .lp-contact-footer .footer-menu__link {
    font-size: 0.8125rem;
  }
  .lp-contact-footer .footer-menu__copyright {
    font-size: 0.6875rem;
  }
}

.lp-contact-footer .footer-app {
  background: #FFF9CC;
  padding: 2.375rem 0;
}
.lp-contact-footer .footer-app__title {
  text-align: center;
  line-height: 1.58;
  font-size: 1.5rem;
  font-weight: bold;
}
.lp-contact-footer .footer-app__title > span {
  display: inline-block;
  text-align: center;
  color: #333;
  padding: 0 2.5rem;
  position: relative;
}
.lp-contact-footer .footer-app__links {
  margin-top: 1.5rem;
  display: flex;
  justify-content: center;
  column-gap: 2.5rem;
  list-style: none;
  padding: 0;
}
.lp-contact-footer .footer-app__link {
  display: inline-block;
}
.lp-contact-footer .footer-app__link > img {
  height: 5.1875rem;
  width: auto;
}
@media (max-width: 767px) {
  .lp-contact-footer .footer-app__title {
    font-size: 1.0625rem;
    margin-left: -0.375rem;
    margin-right: -0.375rem;
  }
  .lp-contact-footer .footer-app__title > span {
    padding: 0 1.375rem;
  }
  .lp-contact-footer .footer-app__links {
    flex-direction: column;
    row-gap: 1.5rem;
    align-items: center;
  }
}

.lp-contact-footer .footer-logo {
  height: 5rem;
  display: flex;
  justify-content: center;
  align-items: center;
}
.lp-contact-footer .footer-logo__img {
  width: 36.875rem;
}
@media (max-width: 767px) {
  .lp-contact-footer .footer-logo {
    height: 3.75rem;
  }
  .lp-contact-footer .footer-logo__img {
    width: 21.25rem;
  }
}
`;

const FOOTER_TEMPLATE_HTML = `
<style>
${FOOTER_TEMPLATE_CSS}
</style>
<div
  class="lp-contact-footer"
  style="
    --conditions-bg1: {{bg:conditionsBg1}};
    --conditions-bg2: {{bg:conditionsBg2}};
    --conditions-bg3: {{bg:conditionsBg3}};
    --conditions-bg4: {{bg:conditionsBg4}};
    --banner-bg: {{bg:bannerBg}};
    --icon-exclamation: {{bg:iconExclamation}};
    --icon-arrow: {{bg:iconArrow}};
    --icon-arrow-right: {{bg:iconArrowRight}};
  "
>
  <section class="conditions">
    <div class="l-page-contents -conditions">
      <h2 class="conditions__title">
        <img
          data-footer-asset="conditionsTitle"
          src="{{asset:conditionsTitle}}"
          data-asset-id="{{assetId:conditionsTitle}}"
          alt="au PAYご利用条件"
        >
      </h2>
      <p class="conditions__text">
        <img
          data-footer-asset="conditionsText"
          src="{{asset:conditionsText}}"
          data-asset-id="{{assetId:conditionsText}}"
          alt="01.au IDの取得とau PAY アプリが必要です 02.au PAYサービス利用規約への同意が必要です"
        >
      </p>
      <p class="conditions__model">
        対象機種 : iOS16.0以上/Android™7.0以上のスマートフォン・タブレット、watchOS 7.0以上のApple Watch
      </p>
      <div class="conditionsNotesBox">
        <h3 class="conditionsNotesBox__title">注意点</h3>
        <ul class="conditionsNotesBox__notes">
          <li class="conditionsNotesBox__note">au PAY（コード支払い）でのお支払いにはau PAY 残高へのチャージが必要です。</li>
          <li class="conditionsNotesBox__note">1回あたりのお支払い上限額は300,000円（税込）、1日あたりの上限額は500,000円（税込）です。</li>
        </ul>
        <ul class="c-list -sm -au">
          <li>iOSは、Ciscoの米国およびその他の国における商標または登録商標であり、ライセンスに基づき使用されています。</li>
          <li>
            iPhone、iPad、Apple Watchは、米国および他の国々で登録されたApple Inc.の商標です。<br>
            iPhoneの商標は、アイホン株式会社のライセンスに基づき使用されています。<br>
            TM and © 2026 Apple Inc. All rights reserved.
          </li>
          <li>Androidは、Google LLC の商標です。</li>
        </ul>
      </div>
      <div class="conditions__button">
        <a href="https://aupay.wallet.auone.jp/" target="_blank" class="c-button -black">au PAY について詳しくはこちら</a>
      </div>
    </div>
  </section>

  <section class="contact">
    <div class="l-page-contents">
      <h2 class="contact__title">本キャンペーンに関する<br class="_view-md-low">お問い合わせ先</h2>
      <p class="contact__lead">チャット形式でかんたんにお問い合わせいただけます。</p>
      <ul class="contact__wrap">
        <li class="contact__item">
          <a href="https://www.au.com/support/inquiry/message/" target="_blank" class="c-button">お問い合わせ先はこちら</a>
          <p class="contact__text">受付時間 : 24時間（年中無休）<br>回答時間 : AI : 24時間（コミュニケーター : 9〜20時）</p>
        </li>
        <li class="contact__item">
          <a href="http://kddi-l.jp/KOt" target="_blank" class="c-button">よくあるご質問</a>
          <p class="contact__text">auサービスやPontaポイントに関するよくあるご質問</p>
        </li>
      </ul>
    </div>
  </section>

  <div class="banner-head">
    <p class="banner-head__text">
      <img
        data-footer-asset="bannerHeadTitle"
        src="{{asset:bannerHeadTitle}}"
        data-asset-id="{{assetId:bannerHeadTitle}}"
        alt="Pontaポイントをau PAYマーケットでおトクに活用！"
      >
    </p>
  </div>

  <a class="banner" href="https://wowma.jp/event/ptexchg_potal/index.html" target="_blank">
    <div class="banner__main">
      <img
        data-footer-asset="bannerMain"
        src="{{asset:bannerMain}}"
        data-asset-id="{{assetId:bannerMain}}"
        alt="au、UQ mobileをご利用なら！ Pontaポイント1.5倍"
      >
    </div>
    <div class="banner__more">
      <p class="banner__moreText">
        <img
          data-footer-asset="bannerMore"
          src="{{asset:bannerMore}}"
          data-asset-id="{{assetId:bannerMore}}"
          alt="au PAYマーケットについて詳しくはこちら"
        >
      </p>
    </div>
  </a>

  <div class="magazine">
    <a href="https://media.aupay.wallet.auone.jp/?utm_source=aupay_cplp&utm_medium=referral&utm_campaign=aupay_cplp" class="magazine__btn" target="_blank">
      <img
        data-footer-asset="magazineBanner"
        src="{{asset:magazineBanner}}"
        data-asset-id="{{assetId:magazineBanner}}"
        alt="au PAYのおトクな使い方ガイド 開催中キャンペーン・割引クーポン情報も！ au PAY magazine"
      >
    </a>
  </div>

  <div class="fixed-btn" id="btn-fixed">
    <p class="fixed-btn__note">※ご利用前に「対象ブランド」「対象店舗」を必ずご確認ください。</p>
    <a href="https://camp.auone.jp/campaign/15f3cd70c7083fe0e781d0b8" class="c-button-c -border" id="btn-fixed_01">エントリーはコチラ</a>
  </div>

  <footer class="footer">
    <div class="footer-menu">
      <div class="l-page-contents">
        <ul class="footer-menu__links">
          <li><a href="https://www.kddi.com/terms/sitepolicy/" target="_blank" class="footer-menu__link">サイトポリシー</a></li>
          <li><a href="https://www.kddi.com/corporate/kddi/profile/overview/" target="_blank" class="footer-menu__link">会社概要</a></li>
          <li><a href="https://www.kddi.com/terms/requirements/" target="_blank" class="footer-menu__link">動作環境、Cookie情報の利用、広告配信などについて</a></li>
        </ul>
        <small class="footer-menu__copyright">COPYRIGHT © KDDI CORPORATION. ALL RIGHTS RESERVED.</small>
      </div>
    </div>

    <div class="footer-app">
      <div class="l-page-contents">
        <h2 class="footer-app__title">
          <span>auユーザーじゃなくてもつかえる！<br>いますぐau PAY アプリをダウンロード</span>
        </h2>
        <ul class="footer-app__links">
          <li>
            <a href="https://app.adjust.com/u46hfz1?campaign=merchant_704" target="_blank" class="footer-app__link">
              <img
                data-footer-asset="appStore"
                src="{{asset:appStore}}"
                data-asset-id="{{assetId:appStore}}"
                alt="App Storeからダウンロード"
              >
            </a>
          </li>
          <li>
            <a href="https://app.adjust.com/ue7k6kw?campaign=merchant_704" target="_blank" class="footer-app__link">
              <img
                data-footer-asset="googlePlay"
                src="{{asset:googlePlay}}"
                data-asset-id="{{assetId:googlePlay}}"
                alt="Google Playで手に入れよう"
              >
            </a>
          </li>
        </ul>
      </div>
    </div>

    {{footerLogoSection}}
  </footer>
</div>
`;

const FOOTER_LOGO_SECTION = `
    <div class="footer-logo">
      <p class="footer-logo__img">
        <img
          data-footer-asset="footerLogo"
          src="{{asset:footerLogo}}"
          data-asset-id="{{assetId:footerLogo}}"
          alt="F＆LCグループ（スシロー、回転寿司みさき、京樽、杉玉）× au PAY"
        >
      </p>
    </div>
`;

const resolveAsset = (
  assets: AssetMap | undefined,
  assetId?: string
): string => {
  if (!assetId) {
    return "";
  }
  if (
    assetId.startsWith("data:") ||
    assetId.startsWith("http") ||
    assetId.startsWith("/")
  ) {
    return assetId;
  }
  return assets?.[assetId]?.data ?? "";
};

const resolveBgValue = (
  assets: AssetMap | undefined,
  assetId?: string,
  fallbackUrl?: string
) => {
  const dataUrl = resolveAsset(assets, assetId) || fallbackUrl || "";
  if (!dataUrl) {
    return "none";
  }
  return `url('${dataUrl}')`;
};

export const buildFooterHtml = (
  assets: AssetMap | undefined,
  footerAssets: FooterAssets | undefined,
  options?: { brandBarAssetId?: string; hideFooterLogo?: boolean }
) => {
  let html = FOOTER_TEMPLATE_HTML;
  const footerLogoSection = options?.hideFooterLogo ? "" : FOOTER_LOGO_SECTION;

  html = html.replaceAll("{{footerLogoSection}}", footerLogoSection);

  FOOTER_ASSET_KEYS.forEach((key) => {
    const linkedAssetId =
      key === "footerLogo" ? options?.brandBarAssetId : undefined;
    const assetId =
      key === "footerLogo" && linkedAssetId
        ? linkedAssetId
        : footerAssets?.[key] ?? linkedAssetId;
    const dataUrl =
      resolveAsset(assets, assetId) || FOOTER_DEFAULT_ASSET_PATHS[key] || "";
    html = html.replaceAll(`{{asset:${key}}}`, dataUrl);
    html = html.replaceAll(`{{assetId:${key}}}`, assetId ?? "");
  });

  FOOTER_BG_KEYS.forEach((key) => {
    const assetId = footerAssets?.[key];
    const bgValue = resolveBgValue(
      assets,
      assetId,
      FOOTER_DEFAULT_ASSET_PATHS[key]
    );
    html = html.replaceAll(`{{bg:${key}}}`, bgValue);
  });

  return html;
};
