# Security

脆弱性の報告は、公開Issueへ管理URL、公式参加URL、実データを貼らず、GitHubのPrivate vulnerability reportingを利用してください。

## Controls

- 128-bitのイベントIDと256-bit管理鍵。D1には管理鍵のSHA-256 hashだけを保存し、一定時間比較を行う
- HTTPSかつVRChat、cluster、Resoniteの許可ホスト・pathだけを公式参加URLとして受け付け、queryとfragmentを除去
- 可視文字列からURL、メール、電話、SNS handle、Discord・LINE招待、成人向け・出会い目的を拒否
- JSON content type、body size、same-origin、ID、enum、日時、最大8時間、文字数、honeypotを検証
- 一つの匿名セッションから1日3件まで。異なる3セッションの通報で即時非表示し、公式参加URLを消去
- 管理者による公開終了・再開・削除。単発終了24時間後にURL除去、イベント30日、匿名記録120日の期限削除
- CSP、HSTS、COOP、CORP、frame拒否、MIME sniffing拒否、権限API拒否、no-referrer
- 管理・イベント詳細を`noindex,nofollow,noarchive`と`Cache-Control: no-store`で検索・キャッシュから除外
- ユーザー生成HTMLを描画せず、Hono JSXまたはescape済みDOMへ出力

## Known boundaries

- 公式参加先の会場内容、年齢区分、主催者本人性を自動監査しない。参加前の確認と通報が必要
- 匿名セッションは端末で作るため、複数端末・ブラウザを使う濫用を厳密には識別しない
- 公式参加URLは推測不能な秘密ではない。画面へ直接表示しないが、参加操作をした利用者は取得できる
- 管理URLを受け取った人はイベントを操作できる。管理URLの転送を完全には防げない
- メール、外部ログイン、ファイル、決済、個人連絡先を扱わず、攻撃面と継続責任を限定する
