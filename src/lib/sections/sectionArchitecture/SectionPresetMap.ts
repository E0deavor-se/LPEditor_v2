type SectionPreset = {
  data: Record<string, unknown>;
};

const DEFAULT_LEGAL_NOTES_LINES = [
  "割引額は、小数点以下切り捨てとなります。",
  "＊レジで表示されているお買上げ金額は割引表示されません。割引後の金額はau PAY アプリの「履歴」をご確認ください。",
  "クーポンは〇回〇〇〇〇円（税込）以上のお支払いにご利用いただけます。クーポン適用前のお支払い額が〇〇〇〇円（税込）未満となる場合はクーポンが適用されず、クーポン適用前の金額で決済されます。",
  "キャンペーン期間中でも、クーポンの割引総額が所定の金額に達した場合、クーポン配布終了（au PAY アプリ内クーポン一覧非表示）となり、獲得済みクーポンのご利用は不可となります。",
  "au PAYが提供する他の割引とクーポンは併用できません。",
  "1つの店舗に対してクーポンが2つ以上発行されている場合、クーポン適用の優先順位は下記の通りです。",
  "①利用期限までの日数が少ないクーポンが優先されます。",
  "②利用期限までの日数が同じ場合、割引上限金額が大きいクーポンが優先されます（割引率には関係なく、割引上限金額が大きい方が優先されます）。",
  "クーポンはいかなる場合においても一切譲渡・換金できません。",
  "クーポンを使用した決済をキャンセルした場合、お客様がお支払いされた金額のみを返金するものとし、クーポンで割引された額については返金いたしません。",
  "クーポンを利用した決済の後に、一部キャンセルした場合は、クーポンの再発行は一切行いません。",
  "KDDIが不正と判断した場合は、クーポンは無効となります。",
  "掲載期間内であっても今後も同一又は更におトクなクーポンを提供する場合があります。",
  "本キャンペーンは予告なく変更・終了する場合があります。",
  "202〇年〇月〇日時点の情報です。",
];

const DEFAULT_CAMPAIGN_OVERVIEW_BODY_LINES = [
  "期間中、「〇〇〇」の対象店舗で 1回〇〇〇円（税込）以上の",
  "au PAY（コード支払い）で 使える最大〇〇％割引クーポンをau PAY アプリにてプレゼント！",
];

const DEFAULT_CAMPAIGN_OVERVIEW_NOTICE_LINES = [
  "〇〇店、〇〇店は対象外です。",
  "一部休業中店舗がございます。詳細はHPをご確認ください。",
];

export const sectionPresetMap: Partial<Record<string, SectionPreset>> = {
  heroImage: {
    data: {
      imageAssetIdPc: "",
      imageAssetIdSp: "",
      imageUrl: "",
      imageUrlSp: "",
      alt: "",
      altText: "",
    },
  },
  campaignPeriodBar: {
    data: {
      periodLabel: "キャンペーン期間",
      periodBarText: "",
      startDate: "2026-03-01",
      endDate: "2026-03-31",
      showWeekday: true,
      allowWrap: true,
      periodBarStyle: {
        background: "#EB5505",
        color: "#FFFFFF",
        labelColor: "#FFFFFF",
        size: 14,
        bold: true,
        paddingX: 18,
        paddingY: 0,
        shadow: "none",
      },
    },
  },
  targetStores: {
    data: {
      title: "対象店舗",
      description: "条件を指定して対象店舗を検索できます。",
      note: "ご注意ください！\nリストに記載があっても、店舗の休業・閉業・移転や、その他の事情により利用できない場合があります。",
      variant: "searchCards",
      searchPlaceholder: "店舗名・住所など",
      resultCountLabel: "表示件数",
      emptyMessage: "条件に一致する対象店舗が見つかりませんでした。",
      pagerPrevLabel: "前へ",
      pagerNextLabel: "次へ",
      showSearchBox: true,
      showRegionFilter: true,
      showLabelFilters: true,
      showResultCount: true,
      showPager: true,
      pageSize: 10,
      cardVariant: "outlined",
      cardPreset: "standard",
      cardBg: "#ffffff",
      titleBandColor: "#ffffff",
      titleTextColor: "#1d4ed8",
      cardBorderColor: "#d1d5db",
      cardRadius: 12,
      cardShadow: "none",
    },
  },
  rankingTable: {
    data: {
      title: "ランキング",
      subtitle: "最新順位はこちら",
      period: "",
      date: "",
      columns: [
        { key: "amount", label: "決済金額" },
        { key: "count", label: "品数" },
      ],
    },
  },
  couponFlow: {
    data: {
      title: "クーポン利用の流れ",
      lead: "＊必ずクーポンを獲得してからau PAY（コード支払い）でお支払いください。",
      note: "※画面はイメージです。",
      variant: "slideshow",
      ctaEnabled: true,
      buttonLabel: "クーポンを獲得する",
      buttonUrl: "",
      buttonPreset: "couponFlow",
      buttonVariant: "primary",
      buttonBg: "#ea5504",
      buttonTextColor: "#ffffff",
      buttonBorderColor: "#ffffff",
      buttonRadius: 999,
      buttonShadow: "0 6px 14px rgba(0, 0, 0, 0.18)",
      slideshow: {
        autoplay: true,
        intervalMs: 3500,
        loop: true,
        showArrows: true,
        showDots: true,
        allowSwipe: true,
      },
    },
  },
  campaignOverview: {
    data: {
      title: "キャンペーン概要",
      body: DEFAULT_CAMPAIGN_OVERVIEW_BODY_LINES.join("\n"),
      bodyLines: [...DEFAULT_CAMPAIGN_OVERVIEW_BODY_LINES],
      noticeLines: [...DEFAULT_CAMPAIGN_OVERVIEW_NOTICE_LINES],
      noticeEnabled: true,
      bodyWidthPct: 100,
      noticeBg: "#fff7ed",
      noticeBorderColor: "#fed7aa",
      noticePaddingPx: 14,
    },
  },
  legalNotes: {
    data: {
      title: "注意事項",
      items: [...DEFAULT_LEGAL_NOTES_LINES],
      bullet: true,
      noteWidthPct: 100,
      noteBg: "#ffffff",
      noteBorderColor: "#e5e7eb",
      notePaddingPx: 24,
    },
  },
  paymentHistoryGuide: {
    data: {
      title: "決済履歴の確認方法",
      body: "現在の決済金額については、au PAY アプリ内の「取引履歴」をご確認ください。",
      linkText: "こちら",
      linkUrl: "#contact",
      linkTargetKind: "url",
      linkSectionId: "",
      linkSuffix: "までお問い合わせください。",
      alert:
        "なお、店頭や問い合わせ窓口での現在の順位や金額、当選結果についてのご質問にはお答えできません。",
      imageUrl: "/footer-defaults/img-02.png",
      imageAlt: "決済履歴の確認方法",
      imageAssetId: "",
    },
  },
  paymentUsageGuide: {
    data: {
      title: "決済履歴の確認方法",
      body: "現在の決済金額については、au PAY アプリ内の「取引履歴」をご確認ください。",
      linkText: "こちら",
      linkUrl: "#contact",
      linkTargetKind: "url",
      linkSectionId: "",
      linkSuffix: "までお問い合わせください。",
      alert:
        "なお、店頭や問い合わせ窓口での現在の順位や金額、当選結果についてのご質問にはお答えできません。",
      imageUrl: "/footer-defaults/img-02.png",
      imageAlt: "決済履歴の確認方法",
      imageAssetId: "",
    },
  },
  tabbedNotes: {
    data: {
      title: "注意事項",
      initialTabIndex: 0,
      tabs: [
        {
          id: "tab_1",
          label: "事前獲得クーポン",
          contentTitle: "",
          notes: [
            "＊レジで表示されているお買上げ金額は割引表示されません。割引後の金額はau PAY アプリの「履歴」をご確認ください。",
            "クーポンは1回20,000円（税込）以上のお支払いにご利用いただけます。",
            "※2026年2月6日時点の情報です。",
          ],
        },
        {
          id: "tab_2",
          label: "クイックチャンス",
          contentTitle: "",
          notes: [
            "クーポンの利用期限前であっても、予告なく終了する場合があります。",
            "本キャンペーンは予告なく変更・終了する場合があります。",
            "※2026年2月6日時点の情報です。",
          ],
        },
      ],
      tabStyle: {
        variant: "simple",
        showBorder: true,
        inactiveBg: "#DDDDDD",
        activeBg: "#000000",
        contentBg: "#FFFFFF",
      },
    },
  },
  image: {
    data: {
      imageUrl: "",
      alt: "",
      caption: "",
      alignment: "center",
      width: 720,
      borderRadius: 12,
      backgroundColor: "#ffffff",
      textColor: "#111111",
      paddingTop: 24,
      paddingBottom: 24,
    },
  },
  stickyNote: {
    data: {
      title: "",
      body: "",
      themeColor: "#f59e0b",
      presetColor: "#fef3c7",
      icon: "",
      borderRadius: 14,
      shadow: "soft",
      backgroundColor: "#fff7d6",
      textColor: "#3f2f10",
      paddingTop: 20,
      paddingBottom: 20,
    },
  },
  contact: {
    data: {
      title: "本キャンペーンに関するお問い合わせ先",
      description: "チャット形式でかんたんにお問い合わせいただけます。",
      buttonLabel: "お問い合わせ先はこちら",
      buttonUrl: "https://www.au.com/support/inquiry/message/",
      note: "受付時間 : 24時間（年中無休）\n回答時間 : AI : 24時間（コミュニケーター : 9〜20時）",
      textAlign: "center",
      backgroundColor: "#000000",
      buttonColor: "#fa5902",
      textColor: "#ffffff",
      paddingTop: 45,
      paddingBottom: 50,
    },
  },
  footer: {
    data: {
      companyName: "",
      copyrightText: "",
      linksText: "",
      subText: "",
      backgroundColor: "#111827",
      textColor: "#f9fafb",
      paddingTop: 20,
      paddingBottom: 20,
    },
  },
};

export const mergeSectionPresetData = (type: string, currentData: Record<string, unknown>) => {
  const preset = sectionPresetMap[type];
  if (!preset) {
    return currentData;
  }
  return {
    ...preset.data,
    ...currentData,
  };
};
