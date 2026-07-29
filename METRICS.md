# Metrics

イベント登録から、共有・カレンダー追加・公式参加先遷移・参加予定確認までを匿名で測る。Cookieや外部解析SDKは使わない。

| Stage           | Meaning                            | Event                            |
| --------------- | ---------------------------------- | -------------------------------- |
| `signed_up`     | 匿名セッションを開始した           | `visited`                        |
| `activated`     | イベントを登録した                 | `event_created`                  |
| `value_created` | 他者が公開イベントを確認した       | `event_viewed`                   |
| `job_completed` | カレンダー追加または公式先へ進んだ | `calendar_added` / `join_opened` |
| `returned`      | 別日に再訪または再登録した         | `returned`                       |

## Required ratios

- Activation: `activated / signed_up`
- Value creation: `value_created / activated`
- Completion: `job_completed / value_created`
- Return: `returned / job_completed`
- Seven-day new users and completed jobs

追加指標は、公開中イベント、ユニーク主催者、共有文コピー、参加予定確認、通報数、非表示数とする。

## Operator contract

- `npm run metrics`は本番集計をJSONで標準出力する。
- 出力は`generated_at`、`service`、`environment`、`funnel`、`rates`を持つ。
- イベント名、主催者名、URL、個別ID、通報理由を出力しない。
- 分母0の比率は`null`とし、失敗や欠測を成功扱いしない。
- 生ログは公開しない。少数セルや自由記述から個人を推測できる出力を作らない。
