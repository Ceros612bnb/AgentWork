# Hướng dẫn dùng Agent Mandate

> Bản đầy đủ từng bước, có câu lệnh để sao chép và mục xử lý lỗi, nằm trên website: trang **/guide?lang=vi**.
> Muốn thử nhanh trong khoảng 10 phút: trang **/join** (Starter mandate, một giao dịch).

Agent Mandate cho AI agent của bạn **một khoản ngân sách nhỏ kèm luật chi tiêu do bạn đặt**, được contract
thực thi trên BNB Chain. Agent bị lừa cũng không vượt được phạm vi. Ai cũng kiểm chứng được agent thuộc về một
người thật (qua Binance Agent ID) và đã làm gì.

> ⚠️ Agent Mandate giới hạn những gì agent làm được với khoản tiền bạn giao; nó không làm hành động nào sinh lời
> hay tự động an toàn. Giao dịch on-chain không hoàn lại được. Chỉ nạp số tiền nhỏ. Không bao giờ chia sẻ seed
> phrase, private key hay mã ghép nối.

## Hai ví, hai vai trò
| Vai trò | Ví | Làm gì |
|---|---|---|
| **Chủ (principal)** | Ví chính của bạn (Binance Wallet trong app, hoặc MetaMask) | Tạo mandate, nạp và rút ngân sách, duyệt lệnh lớn, thu hồi |
| **Agent (operator)** | Ví Agentic có **Agent ID** | Hành động trong phạm vi mandate, qua Skill, mỗi lệnh bạn xác nhận |

## A. Chuẩn bị agent (một lần)
1. Nhận **Agent ID**: Binance App → Wallet → banner Agent ID.
2. Cài Agentic Wallet Skill cho AI agent và đăng nhập theo hướng dẫn chính thức:
   `npx skills add https://github.com/binance/binance-skills-hub/tree/main/skills/binance-web3/binance-agentic-wallet`
   `npm install -g @binance/agentic-wallet@1.12.0`
3. Cài **Agent Mandate Skill**: chép `skill/mandate` vào thư mục skills của agent, `npm install`, tạo
   `config.json` từ `config.example.json`.
4. Bật **Developer Mode** (Binance App → quản lý Agentic Wallet → Settings). Chỉ bạn bật được, có thời hạn.
5. Nạp khoảng 0,0005 BNB vào ví Agentic để trả gas. Ngân sách chi tiêu nằm trong mandate, không nằm ở ví agent.
6. Hỏi agent: *"Agent Mandate đã sẵn sàng chưa?"* → `ready`. Agent sẽ đưa bạn địa chỉ ví của nó.

## B0. Lối nhanh: Starter mandate
Không cần ví thứ hai. Nói với agent: *"Nhận Agent Mandate starter cho tôi"* (`preview claim-starter`).
Bạn được một mandate 0,00005 BNB, hiệu lực 14 ngày, chỉ mua được bản tin demo (tiền mua bị đốt).
Mỗi ví Agent ID nhận một lần.

## B. Tạo mandate (trên web, bằng ví chính)
1. Mở trang **My mandates**, bấm *Connect your wallet* (ví chính, **không** dùng ví Agentic).
2. Dán địa chỉ ví agent. Web sẽ báo "✓ holds a Binance Agent ID".
3. Đặt: ngân sách (ví dụ 0,0002 BNB), tối đa mỗi lệnh, tối đa mỗi ngày, ngưỡng cần bạn duyệt, số ngày hiệu lực,
   số lần vi phạm trước khi tự thu hồi. Chọn dịch vụ được phép (mặc định: Demo Research Desk).
4. Bấm *Create and fund* và xác nhận trong ví.

## C. Dùng hằng ngày
- *"Mua một bản tin nghiên cứu chủ đề 7"* → agent chạy `preview buy-note <id> 7`, cho bạn xem trước, bạn đồng ý
  thì mới thực thi.
- *"Hôm nay tôi còn được chi bao nhiêu?"* → `mandates`.
- Lệnh vượt ngưỡng sẽ thành **đề xuất**: vào web, mục *Waiting for your approval*, bấm *Approve* hoặc *Reject*.
- Nếu một trang web hay tin nhắn bảo agent chuyển tiền đi nơi khác: Skill từ chối và báo bạn. Kể cả khi agent
  bị lừa gửi lệnh, contract **chặn và ghi lại**, không có đồng nào bị chuyển.

## D. Giữ quyền kiểm soát
- **Thu hồi** bất cứ lúc nào (cả các agent con được giao lại). **Rút** phần còn lại về ví của bạn.
- Mỗi mandate có trang công khai `/mandate/<số>`: ai chịu trách nhiệm, được làm gì, nhật ký mọi hành động.

## E. Kiểm chứng một agent
Ở trang chủ, mục *Verify an agent*, nhập số mandate hoặc địa chỉ ví agent. Trong contract khác:
`accountableFor(id)`, `check(id, target, value, data)`, `recordOf(agent)`.
