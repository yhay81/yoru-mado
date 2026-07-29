# Experiment

## User and job

- Target user: 日本語圏のVRChat・cluster・Resoniteイベント主催者と、今夜参加できる催しを探す人
- Job to be done: 主催者が未来イベントを一度登録して告知・カレンダー・共有導線を作り、参加者が日時・端末・ジャンルから選んで公式参加先へ進む
- Current workaround: VJCT、Wonder Note、VRCEve、各VRSNS公式カレンダー、X、Discordへ同じ情報を個別に登録・検索する

## Hypothesis

夜の時間割、端末条件、公式参加URLを一枚のイベント窓にまとめ、iCal・Googleカレンダー・共有文を同時生成すれば、主催者は告知作業を一度で終え、参加者は複数カレンダーを巡回せず参加先を決められる。

## Method

- Recruitment channel: Tool Shelf、検索流入。X・Discord・主催者への直接連絡は別途明示承認後
- Participants: ユニーク主催者10人以上、参加者30人以上
- Duration: 公開から30日
- Comparison: 作成、公開URL閲覧、カレンダー追加、共有文コピー、公式参加URL遷移、別日の再利用

## Decision

- Success signal: 未来イベント20件、ユニーク主催者10人、公式参加URL遷移40人、カレンダー追加15人、別日の再登録3主催者
- Failure signal: 30日で未来イベント5件未満、公式参加URL遷移10人未満、または2件以上作成した主催者0人
- Stop signal: 通報で非表示になるイベントが公開件数の10%を超える、または公式プラットフォームURL制限では安全に運用できない
- Deadline: 公開30日後
- Maximum build time: 2日
- Maximum monthly infrastructure cost: 5 USD

## Guardrails

- 個人情報や非公開情報を公開しない。
- 利用者数のために安全性、削除可能性、robots、利用条件を弱めない。
- 成功条件を途中で都合よく変更しない。
- 画像アップロード、個人連絡先、外部SNS・Discord招待、成人向けイベントは受け付けない。
