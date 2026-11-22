# Khảo sát gap thực sự cho Agent ID Hackathon (22/11/2026)

Mục tiêu: tìm một vấn đề **quan trọng, có bằng chứng**, mà **Agent ID là mảnh ghép không thể thiếu**, và làm được
trong 17 ngày còn lại. Mỗi nhận định dưới đây đều ghi nguồn; nguồn yếu (blog, tin tổng hợp) được đánh dấu.

## 0. Sự thật nền về cuộc thi và Agent ID (từ thông báo chính thức, 18/11/2026)

- "Each user can claim only one Agent ID, and it is non-transferable." Chỉ claim trong Binance App. Nghĩa là
  **một tài khoản Binance, một Agent ID**. Thông báo không nói rõ KYC, nhưng tài khoản Binance vốn phải KYC.
- Đã có **hơn 100.000 Agent ID** được claim (tin tổng hợp).
- Agentic Wallet là ví tách riêng; chủ ví tự đặt hạn mức chi và giới hạn token trong app. Developer Mode phải
  bật tay, **hết hạn sau 7 ngày**, mỗi thao tác cần xác nhận và có hạn mức ngày riêng (theo README một đội thi, chưa
  kiểm chứng).
- Tiêu chí giải Sáng tạo: độ sâu Agent ID 30%, thực tiễn 25%, hoàn thiện 25%, sáng tạo 20%; cần sản phẩm chạy thật và
  **≥ 30 địa chỉ Agent ID** tương tác. Ví dụ ban tổ chức nêu: *access control, payments, identity*.
- **Đối thủ đã thấy trên GitHub** (hơn 25 repo): huy hiệu soulbound, điểm danh hằng ngày, tip theo tên .ai,
  quest, guestbook, bảng bounty / job board có escrow, danh bạ dịch vụ (AgentBoard), cổng chống Sybil
  (AgentGate, HumanPass: bình chọn, giveaway), hạn mức chi giữa hai Agent ID (AgentPermit). **Không thấy đội nào
  làm "Know Your Agent" (ủy quyền có phạm vi, thu hồi, kiểm toán).**

## 1. Các gap tìm được, xếp theo độ quan trọng

### G1. Hành động của agent "không truy được trách nhiệm" (Know Your Agent) — quan trọng nhất

**Bằng chứng**
- **Chính đội Chính sách toàn cầu của Binance** (McWhirter, Montes Serralde, 2026) công bố báo cáo
  *"Know Your Agent: Building the Compliance Layer for Agentic Finance"*. Họ gọi **hành động không quy được
  trách nhiệm** là rủi ro cốt lõi: KYC biết khách hàng là ai, nhưng không biết lệnh đến từ khách, từ agent được
  ủy quyền, từ agent bị chiếm quyền, hay từ agent con vượt phạm vi. Khung KYA gồm 5 lớp:
  1. danh tính agent, 2. **liên kết với người chịu trách nhiệm**, 3. **mandate và quyền tối thiểu** (tách quyền
  *đề xuất* khỏi quyền *thực thi*), 4. chuỗi ủy quyền có xác thực và giám sát, 5. **thu hồi và kiểm toán**.
  Nguyên tắc "bounded autonomy": hành động hệ trọng phải qua **luật xác định mà agent không vượt được**.
  Báo cáo **chỉ ở mức chính sách, không có hiện thực kỹ thuật**, không nhắc Agent ID hay on-chain.
- Khảo sát học thuật *AI Identity: Standards, Gaps, and Research Directions for AI Agents* (Otsuka, Toyoda,
  Leung, arXiv:2604.23280, 4/2026, ~80 nguồn): "No deployed protocol can cryptographically prove which human
  principal authorized which specific agent to perform which specific action" ở các bước ủy quyền sâu. Đề xuất
  **scope attenuation** (mỗi bước ủy quyền chỉ được thu hẹp quyền), **audit trail bất biến**, **agent bị chiếm
  quyền phải kích hoạt thu hồi**. Bài không đề cập blockchain hay ERC-8004.
- Cơ quan quản lý đang đi theo hướng này: MAS SAFR (Singapore, 7/2026), kế hoạch AI của ngành tài chính Anh khuyến
  nghị giao thức "Know Your Agent"; AP2 của Google dùng "mandate" ký số nhưng **trách nhiệm pháp lý vẫn chưa được
  phân định** (Clifford Chance 8/2026, Worldpay).
- **Thiệt hại thật**: nghiên cứu Princeton (arXiv:2503.16248) cho thấy agent Web3 (ElizaOS) bị **memory
  injection** chuyển tiền cho kẻ tấn công, các phòng thủ bằng prompt đều yếu ("no silver bullet"). Sự cố thực:
  Bankr bị chiếm 14 ví; ví agent liên kết Grok mất khoảng $175.000 vì lệnh ẩn bằng mã Morse trong một tweet
  (5/2026); agent Lobstar Wilde mất khoảng $440.000 vì lỗi trạng thái (2/2026). *(Các con số sự cố là từ tin tổng
  hợp, chưa đối chiếu post-mortem gốc.)*

**Agent ID khớp thế nào**: Agent ID **chính là lớp 1 và 2** của KYA: mỗi agent gắn với đúng một người dùng Binance,
không chuyển nhượng được. Thứ còn thiếu là lớp 3, 4, 5 on-chain: mandate kiểm chứng được, ủy quyền thu hẹp dần,
thu hồi, kiểm toán.

**Khoảng trống còn lại sau khi trừ tính năng sẵn có của Agentic Wallet**: hạn mức trong app là **riêng tư và thô**
(theo số tiền, token). Bên thứ ba (dApp, merchant, agent khác) **không kiểm chứng được** agent đang hành động trong
phạm vi nào, ai chịu trách nhiệm, mandate đã bị thu hồi chưa. Cũng không có allowlist theo contract, thời hạn,
ủy quyền cho agent con, hay nhật ký kiểm toán on-chain.

### G2. Uy tín agent bị Sybil làm nhiễu (ví dụ: bảng thành tích dự báo chấm bằng oracle)
- arXiv:2606.26028: 0% đánh giá ERC-8004 trên BSC có bằng chứng thanh toán; 59,2% người đánh giá thuộc cụm Sybil.
- *Five Attacks on x402* (arXiv:2605.11781): làm ngập dịch vụ giả khiến agent chọn dịch vụ độc hại tới **93%**.
- **Khớp Agent ID**: mạnh (một người một thành tích). **Yếu ở thực tiễn**: ai dùng điểm dự báo lên/xuống giá?

### G3. Phân phối chống Sybil (airdrop, bình chọn, giveaway)
- Arbitrum: ước tính 21,8% token airdrop vào cụm Sybil (phân tích bên thứ ba); arXiv:2312.02752 coi Sybil là lỗi
  thiết kế cốt lõi của airdrop.
- **Đông đối thủ** (AgentGate, HumanPass, các quest board). Sáng tạo thấp.

### G4. Thanh toán giữa agent với agent (x402)
- 25 lỗ hổng trong SDK x402 (10/2026, nguồn thứ cấp); các lớp lỗi về thanh toán trùng, vượt hạn mức.
- Phạm vi rộng, khó làm xong trong 17 ngày; AgentPermit đã chiếm một phần (hạn mức chi giữa hai Agent ID).

## 2. So sánh

| | G1 KYA Mandate | G2 Uy tín chống Sybil | G3 Phân phối chống Sybil | G4 x402 |
|---|---|---|---|---|
| Vấn đề quan trọng, có bằng chứng | **Rất cao** (Binance, học thuật, nhà quản lý, thiệt hại thật) | Cao (một bài đo) | Trung bình | Cao |
| Agent ID không thể thiếu | **Cao** (lớp 1–2 của KYA) | Cao | Cao | Trung bình |
| Thực tiễn | **Cao** (ai giao tiền cho agent cũng cần) | Trung bình thấp | Trung bình | Cao |
| Khác biệt so với đối thủ | **Chưa ai làm** | Chưa ai làm | Đông | AgentPermit gần |
| Làm kịp 17 ngày | Trung bình | Trung bình | Dễ | Khó |
| Khớp với ban giám khảo Binance | **Đúng khung chính sách của Binance** | Trung bình | Thấp | Trung bình |

## 3. Đề xuất: G1, "Agent Mandate" (tên tạm), lớp KYA on-chain cho Agentic Wallet

**Một câu**: người dùng giao cho agent **một khoản tiền nhỏ kèm một mandate on-chain** (được gọi contract nào, tối đa
bao nhiêu mỗi ngày, hết hạn khi nào). Contract **chặn mọi lệnh vượt phạm vi, kể cả khi agent bị prompt injection**,
chủ có nút thu hồi tức thì, và **ai cũng kiểm chứng được** agent này thuộc về một người thật (Agent ID), đang hành
động trong phạm vi nào, đã làm gì.

| Lớp KYA (Binance) | Hiện thực |
|---|---|
| 1–2 Danh tính, người chịu trách nhiệm | Operator phải giữ Agent ID; principal là ví chính của người dùng |
| 3 Mandate, quyền tối thiểu | Allowlist contract và hàm, hạn mức theo ngày và theo lệnh, thời hạn; lệnh lớn cần principal đồng ký (tách đề xuất / thực thi) |
| 4 Ủy quyền | Agent giao lại cho agent con với **phạm vi chỉ được hẹp hơn** (scope attenuation, kiểm tra on-chain) |
| 5 Thu hồi, kiểm toán | Principal thu hồi một lệnh; mỗi hành động phát sự kiện kèm mã băm mandate; trang kiểm toán công khai |
| Bên thứ ba | `isWithinMandate(agent, target, value)` và `accountableFor(agent)` để dApp hay agent khác kiểm tra trước khi nhận lệnh |

**Demo mạnh nhất**: phát lại kịch bản kiểu vụ Grok/Bankr. Agent đọc một tin nhắn độc hại và cố chuyển tiền cho kẻ
tấn công. Ví thường thì mất tiền; với Agent Mandate, giao dịch **revert `OutsideMandate`**, sự kiện bị ghi lại, chủ bấm
thu hồi.

**Rủi ro phải kiểm tra trước khi cam kết**
1. Agentic Wallet (Developer Mode) gọi được contract tự viết. Agent chỉ gọi `execute` với value 0; tiền chi lấy từ mandate.
2. Contract giữ tiền: phải công bố rõ, chỉ principal rút được, không approve vô hạn, có test và fork check. Cần
   giữ đúng lằn ranh đỏ "no unauthorized transfers".
3. Trùng một phần với hạn mức sẵn có trong app. Phải nói rõ giá trị tăng thêm: **kiểm chứng được bởi bên thứ ba,
   chi tiết theo contract, ủy quyền cho agent con, kiểm toán**.
4. Kéo 30 người: mỗi người nạp một khoản rất nhỏ (ví dụ 0,001 BNB), tạo mandate, cho agent làm một tác vụ
   (ví dụ trả phí cho một dịch vụ mẫu).

## 4. Kế hoạch 17 ngày nếu chọn G1

| Ngày | Việc |
|---|---|
| 23–24/11 | Chốt đặc tả mandate; viết `AgentMandate.sol` cùng test |
| 25–26/11 | Ủy quyền cho agent con, thu hồi, đồng ký; fork check trên BSC; tự review bảo mật |
| 27–28/11 | Skill `mandate` (tạo, nạp, thực thi, thu hồi, kiểm tra) và dịch vụ mẫu |
| 29/11 | Deploy mainnet, verify; web (bảng mandate, nhật ký kiểm toán, demo chặn tấn công) |
| 30/11–7/12 | Mời ≥ 30 người dùng; video demo tấn công bị chặn; slide dẫn khung KYA của Binance |
| 8/12 | Nộp bài (hạn 9/12 08:00 UTC) |

## Nguồn
- Thông báo cuộc thi: https://www.binance.com/en/support/announcement/detail/95f5dbe0ea674a48a739b59e046648bf
- Binance Global Policy, KYA (thông cáo): https://www.zawya.com/en/press-release/research-studies/binance-global-policy-proposes-know-your-agent-framework-to-close-the-accountability-gap-in-agentic-finance-1652209
- Otsuka et al., arXiv:2604.23280: https://arxiv.org/abs/2604.23280
- South et al., Authenticated Delegation and Authorized AI Agents, arXiv:2501.09674: https://arxiv.org/abs/2501.09674
- Adler et al., Personhood credentials, arXiv:2408.07892: https://arxiv.org/abs/2408.07892
- Patlan et al. (Princeton), Real AI Agents with Fake Memories, arXiv:2503.16248: https://arxiv.org/abs/2503.16248
- Five Attacks on x402, arXiv:2605.11781: https://arxiv.org/abs/2605.11781
- Sybil-Resistant Service Discovery for Agent Economies, arXiv:2510.27554: https://arxiv.org/abs/2510.27554
- Airdrops: Giving Money Away Is Harder Than It Seems, arXiv:2312.02752: https://arxiv.org/abs/2312.02752
- Clifford Chance, roundtable on agentic payments (8/2026): https://www.cliffordchance.com/content/dam/cliffordchance/briefings/2026/08/roundtable-on-agentic-payments-and-the-emerging-regulatory-landscape.pdf
- Mastercard, Know Your Agent: https://www.mastercard.com/us/en/news-and-trends/stories/2026/agentic-commerce-identity-know-your-agent.html
- Sự cố (nguồn thứ cấp): https://cointelegraph.com/news/bankr-disables-transactions-after-14-wallets-hacked ;
  https://cryptoslate.com/how-one-trader-exploited-grok-and-morse-code-to-trick-ai-agent-into-sending-billions-of-crypto-tokens-from-a-verified-wallet/ ;
  https://www.kucoin.com/news/flash/ai-agent-lobstar-wilde-loses-440-000-in-solana-transfer-error
- Đối thủ: https://github.com/candaraz/agent-permit ; https://github.com/wellyparker/agentgate ;
  https://github.com/Investorquab/HumanPass ; https://github.com/bondan0/agentboard
