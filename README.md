# よる窓

VRChat・cluster・Resoniteの未来イベントを、今夜の時間割として探し、主催者が告知ページ・iCal・Googleカレンダー・共有文を一度に作る公開イベント台帳です。

<https://yoru-mado.yhay81.com>

## Main flow

- 今日・明日・7日間、VRSNS、対応端末、ジャンル、初心者歓迎で絞る
- 夜の時間割からイベント窓を開く
- iCal、Googleカレンダー、共有文、VRSNS公式参加ページを使う
- 主催者は管理URLから公開終了・再開・削除する

イベント詳細は検索対象にせず、終了イベントの公式参加URLは24時間以内に除去します。画像、個人連絡先、Discord招待、外部SNS、成人向けイベントは受け付けません。Better Auth、Cookie、外部解析SDK、広告、決済はありません。

## Development

```powershell
vp env off
npm ci
npx wrangler d1 migrations apply yoru-mado --local
npm run dev
```

## Quality and release

```powershell
npm run release:check
npm run check
npm test
npm run build
npm run deploy
npm run indexnow
npm run metrics
```

公開前後に、イベント作成、詳細、絞り込み、iCal、Googleカレンダー、共有文、公式参加先、管理、通報、期限更新、390px幅、キーボード、CSP、削除を確認します。
