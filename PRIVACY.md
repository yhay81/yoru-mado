# Privacy

## Collect

- イベント名、主催者表示名、開催日時、VRSNS、対応端末、ジャンル、参加方法、短い紹介、公式プラットフォームURL
- ブラウザで無作為に作る匿名セッション識別子
- 訪問、絞り込み、作成、詳細閲覧、共有文コピー、カレンダー追加、公式参加先への遷移、参加予定の確認
- イベントごとの通報理由と匿名通報者識別子

IPアドレス、User-Agent、Cookie、氏名、メールアドレス、電話番号、個人SNS、Discord招待は製品データとして保存しない。Cloudflareがインフラ保護のために扱う短期ログはCloudflareの方針に従う。

## Publish

イベント情報は公開する。公式参加URLはイベント詳細からの操作時だけ返し、終了・通報非表示・削除時に公開しない。管理鍵、匿名セッション識別子、通報記録、生ログは公開しない。

## Retention and deletion

- 単発イベント: 終了後24時間以内に公式参加URLを除去し、30日以内にイベント本体を削除
- 定期イベント: 主催者が終了するまで次回日時を自動更新。終了後は単発イベントと同じ
- 匿名利用記録: 120日以内に削除
- 削除: 作成時の管理URLから即時削除。管理URLを失った場合はGitHub Security Advisoryから依頼
- Security contact: GitHubのPrivate Vulnerability Reporting
- Operator: yhay81
