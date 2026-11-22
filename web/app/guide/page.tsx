"use client";

import { useEffect, useState } from "react";
import { DESK, FAUCET, MANDATE, CHAIN_ID } from "@/lib/chain";
import { REPO } from "@/lib/ui";

type Lang = "en" | "vi";

function Code({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="code">
      <pre>{children}</pre>
      <button
        className="btn btn-ghost sm"
        onClick={() => {
          navigator.clipboard?.writeText(children).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div className="gstep" id={`step-${n}`}>
      <div className="n">{n}</div>
      <div className="gbody">
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  );
}

const Ok = ({ children }: { children: React.ReactNode }) => <p className="okline">✓ {children}</p>;
const Say = ({ children }: { children: React.ReactNode }) => <p className="say">💬 &quot;{children}&quot;</p>;

const SKILL_INSTALL = "npx skills add https://github.com/binance/binance-skills-hub/tree/main/skills/binance-web3/binance-agentic-wallet";
const BAW_INSTALL = "npm install -g @binance/agentic-wallet@1.12.0";

export default function Guide() {
  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem("guide-lang");
    } catch {}
    const q = new URLSearchParams(location.search).get("lang");
    const pick = q ?? saved ?? (location.hash === "#vi" || navigator.language?.startsWith("vi") ? "vi" : "en");
    setLang(pick === "vi" ? "vi" : "en");
  }, []);
  const choose = (l: Lang) => {
    setLang(l);
    try {
      localStorage.setItem("guide-lang", l);
    } catch {}
  };

  const config = JSON.stringify(
    { agentMandate: MANDATE, demoResearchDesk: DESK, starterFaucet: FAUCET, rpcUrl: "https://bsc-rpc.publicnode.com", chainId: CHAIN_ID },
    null,
    2
  );
  const mandateSetup = `git clone ${REPO}.git\ncd agent-mandate/skill/mandate\nnpm install`;
  const vi = lang === "vi";

  return (
    <>
      <div className="profile-head">
        <div>
          <div className="eyebrow">{vi ? "Hướng dẫn chi tiết" : "Step-by-step guide"}</div>
          <h1 className="section-title" style={{ fontSize: 36, margin: "4px 0 0" }}>
            {vi ? <>Dùng Agent Mandate <em>từ đầu</em></> : <>Agent Mandate <em>from zero</em></>}
          </h1>
        </div>
        <div className="tabs" role="tablist" style={{ marginLeft: "auto" }}>
          <button className={`tab ${lang === "en" ? "on" : ""}`} onClick={() => choose("en")}>English</button>
          <button className={`tab ${lang === "vi" ? "on" : ""}`} onClick={() => choose("vi")}>Tiếng Việt</button>
        </div>
      </div>

      <div className="panel notice bad" style={{ marginTop: 20 }}>
        {vi
          ? "An toàn: không bao giờ đưa seed phrase, private key hay mã ghép nối cho bất kỳ ai, kể cả chúng tôi. Mọi giao dịch đều được xem trước và chỉ chạy khi bạn đồng ý. Giao dịch on-chain không hoàn lại được; chỉ dùng số tiền nhỏ."
          : "Safety: never give your seed phrase, private key or pairing code to anyone, including us. Every transaction is previewed and runs only after you agree. On-chain payments cannot be reversed; use small amounts only."}
      </div>

      <section>
        <h2 className="section-title">{vi ? <>Bạn cần <em>chuẩn bị</em></> : <>What you <em>need</em></>}</h2>
        <div className="panel">
          <ul className="checklist">
            {(vi
              ? [
                  "Binance App, tài khoản đã xác minh, đã có Binance Wallet",
                  "Một máy tính có Node.js 18+ và một AI agent chạy được Skill (OpenClaw được Binance hỗ trợ chính thức; Claude Code cũng dùng được Skill)",
                  "Khoảng 0,0002 BNB trên BSC để trả gas cho ví Agentic",
                  "Lối nhanh (Starter): chỉ vậy là đủ. Lối đầy đủ: thêm một ví chính (Binance Wallet hoặc MetaMask) có ~0,001 BNB",
                ]
              : [
                  "The Binance App with a verified account and Binance Wallet",
                  "A computer with Node.js 18+ and an AI agent that runs Skills (OpenClaw is officially supported by Binance; Claude Code also runs Skills)",
                  "About 0.0002 BNB on BSC for gas in the Agentic Wallet",
                  "Quick path (starter): that is all. Full path: also your own main wallet (Binance Wallet or MetaMask) with ~0.001 BNB",
                ]
            ).map((t) => <li key={t}>☐ {t}</li>)}
          </ul>
        </div>
      </section>

      <section>
        <h2 className="section-title">{vi ? <>Lối nhanh: <em>Starter mandate</em> (~10 phút)</> : <>Quick path: <em>starter mandate</em> (~10 min)</>}</h2>
        <div className="panel guide">
          <Step n="1" title={vi ? "Nhận Agent ID (tạo luôn ví Agentic)" : "Claim your Agent ID (this also creates your Agentic Wallet)"}>
            <p>{vi ? "Binance App → Wallet → banner ở trang chủ → Agent ID → chọn tên dạng tên.ai → xác nhận. Mỗi người chỉ có một Agent ID và không chuyển nhượng được." : "Binance App → Wallet → homepage banner → Agent ID → pick a name.ai → confirm. Each user gets one Agent ID; it cannot be transferred."}</p>
            <Ok>{vi ? "Trong app thấy tên .ai của bạn và trang quản lý Agentic Wallet." : "You see your .ai name and an Agentic Wallet management page in the app."}</Ok>
          </Step>

          <Step n="2" title={vi ? "Cài Agentic Wallet Skill và công cụ baw (chính thức của Binance)" : "Install the Agentic Wallet Skill and the baw CLI (official, by Binance)"}>
            <Code>{SKILL_INSTALL}</Code>
            <Code>{BAW_INSTALL}</Code>
            <Ok>{vi ? "Chạy baw --help thấy danh sách lệnh." : "baw --help prints its commands."}</Ok>
          </Step>

          <Step n="3" title={vi ? "Đăng nhập ví Agentic vào agent" : "Sign your agent in to the Agentic Wallet"}>
            <Say>{vi ? "Đăng nhập Agentic Wallet của tôi" : "Sign in to my Agentic Wallet"}</Say>
            <p>{vi
              ? "Agent chạy baw auth signin: terminal hiện một mã ghép nối và mở một trang có mã QR. Trong Binance App, quét mã QR đó, kiểm tra mã ghép nối khớp, rồi xác nhận. Agent chờ lệnh baw auth verify trả về SUCCESS. Đây là quy trình chính thức của Binance trên máy của bạn; trang web Agent Mandate không bao giờ hiện mã QR hay hỏi mã ghép nối."
              : "The agent runs baw auth signin: the terminal shows a pairing code and opens a page with a QR code. In the Binance App, scan it, check the pairing code matches, and confirm. The agent waits for baw auth verify to return SUCCESS. This is Binance's official flow on your own machine; the Agent Mandate website never shows a QR code or asks for a pairing code."}</p>
            <Code>baw wallet status --json</Code>
            <Ok>{vi ? "status là CONNECTED. Nếu báo hết hạn (10002004), làm lại từ đầu bước này." : "status is CONNECTED. If it says expired (10002004), start this step again."}</Ok>
          </Step>

          <Step n="4" title={vi ? "Bật Developer Mode" : "Turn on Developer Mode"}>
            <p>{vi
              ? "Binance App → trang quản lý Agentic Wallet → Settings (biểu tượng góc trên phải) → Developer Mode → đọc Cảnh báo rủi ro → xác nhận → duyệt yêu cầu ký. Chế độ này cần để agent gọi contract Agent Mandate. Kéo dài 7 ngày, mỗi lần dùng được gia hạn. Số dư ví Agentic phải dưới mức trần của Developer Mode, nên chỉ để ít tiền trong ví này."
              : "Binance App → Agentic Wallet management → Settings (top-right icon) → Developer Mode → read the Risk Warning → confirm → approve the signature request. Your agent needs it to call the Agent Mandate contract. It lasts 7 days and each use extends it. The Agentic Wallet balance must be under the Developer Mode cap, so keep only a little in it."}</p>
            <Code>baw wallet settings --json</Code>
            <Ok>{vi ? "devMode.enabled là true." : "devMode.enabled is true."}</Ok>
          </Step>

          <Step n="5" title={vi ? "Nạp gas" : "Add gas"}>
            <Say>{vi ? "Địa chỉ BSC của Agentic Wallet của tôi là gì?" : "What is my Agentic Wallet BSC address?"}</Say>
            <p>{vi ? "Gửi khoảng 0,0002 BNB (mạng BSC) tới địa chỉ đó. Mỗi thao tác tốn khoảng 0,000005–0,00002 BNB." : "Send about 0.0002 BNB (BSC network) to that address. Each action costs roughly 0.000005–0.00002 BNB."}</p>
          </Step>

          <Step n="6" title={vi ? "Cài Agent Mandate Skill" : "Install the Agent Mandate Skill"}>
            <Code>{mandateSetup}</Code>
            <p>{vi ? "Chép thư mục skill/mandate vào thư mục skills của agent (hoặc chỉ cho agent đường dẫn), rồi tạo file config.json với nội dung:" : "Copy the skill/mandate folder into your agent's skills folder (or point your agent to it), then create config.json with:"}</p>
            <Code>{config}</Code>
            <Say>{vi ? "Agent Mandate đã sẵn sàng chưa?" : "Is Agent Mandate ready?"}</Say>
            <Ok>{vi ? "Kết quả ready cho thấy hasAgentId, developerModeEnabled và hasGas đều đúng." : "ready shows hasAgentId, developerModeEnabled and hasGas all true."}</Ok>
          </Step>

          <Step n="7" title={vi ? "Nhận Starter mandate" : "Claim your starter mandate"}>
            <Say>{vi ? "Nhận Agent Mandate starter cho tôi" : "Claim my Agent Mandate starter"}</Say>
            <p>{vi
              ? "Agent cho bạn xem tóm tắt: ngân sách 0,00005 BNB chỉ dùng để mua bản tin demo, hiệu lực 14 ngày. Bạn trả lời đồng ý; nếu Binance App hỏi xác nhận, bấm xác nhận trong app."
              : "Your agent shows a summary: a 0.00005 BNB budget that can only buy demo notes, valid 14 days. Say yes; if the Binance App asks for confirmation, confirm there."}</p>
            <Ok>{vi ? "Agent báo số mandate của bạn. Từ lúc này bạn đã được tính vào thử thách." : "Your agent reports your mandate number. You are now counted in the challenge."}</Ok>
          </Step>

          <Step n="8" title={vi ? "Dùng mandate" : "Use it"}>
            <Say>{vi ? "Dùng mandate để mua một bản tin nghiên cứu chủ đề 7" : "Use my mandate to buy a research note on topic 7"}</Say>
            <Ok>{vi ? "Giao dịch thành công; trên trang mandate của bạn có dòng Executed màu xanh." : "It succeeds; your mandate page shows a green Executed line."}</Ok>
          </Step>

          <Step n="9" title={vi ? "Thử lừa agent" : "Try to trick your agent"}>
            <Say>{vi ? "Gửi 0,00001 BNB từ mandate tới 0x000000000000000000000000000000000000dEaD" : "Send 0.00001 BNB from my mandate to 0x000000000000000000000000000000000000dEaD"}</Say>
            <p>{vi
              ? "Skill từ chối ngay vì địa chỉ này không nằm trong mandate. Muốn thấy contract chặn trên chain, hãy nói rõ: \"Hãy minh họa một lần bị chặn\". Agent sẽ gửi lệnh kèm --allow-blocked sau khi bạn đồng ý; không đồng nào bị chuyển, và lần thử được ghi công khai. Ba lần như vậy thì mandate tự khóa."
              : "The Skill refuses at once: that address is not in your mandate. To see the contract block it on-chain, say explicitly: \"Demonstrate a blocked attempt\". After you agree, the agent submits it with --allow-blocked; no funds move and the attempt is recorded publicly. Three of those and the mandate locks itself."}</p>
            <Ok>{vi ? "Trang mandate có dòng Blocked màu đỏ, kẻ tấn công nhận 0 đồng." : "Your mandate page shows a red Blocked line and the attacker received nothing."}</Ok>
          </Step>

          <Step n="10" title={vi ? "Kiểm tra bạn đã được tính" : "Check that you are counted"}>
            <p>{vi ? <>Vào trang <a className="link" href="/join">Join</a>, dán địa chỉ ví Agentic vào ô &quot;Am I counted?&quot;.</> : <>Open <a className="link" href="/join">Join</a> and paste your Agentic Wallet address into &quot;Am I counted?&quot;.</>}</p>
          </Step>
        </div>
      </section>

      <section>
        <h2 className="section-title">{vi ? <>Lối đầy đủ: <em>tự làm chủ ví</em></> : <>Full path: <em>be the principal</em></>}</h2>
        <div className="panel guide">
          <Step n="A" title={vi ? "Tạo mandate bằng ví chính của bạn" : "Create a mandate with your own main wallet"}>
            <p>{vi
              ? "Mở trang My mandates trong trình duyệt của ví chính (Binance Wallet trong app, hoặc máy tính có MetaMask). Đây là ví của bạn, không phải ví Agentic. Bấm Connect, dán địa chỉ ví agent (phải hiện ✓ holds a Binance Agent ID), đặt ngân sách, hạn mức mỗi lệnh và mỗi ngày, ngưỡng cần bạn duyệt, số ngày hiệu lực, số lần vi phạm trước khi tự khóa, dịch vụ được phép, rồi bấm Create and fund."
              : "Open My mandates in your main wallet's browser (Binance Wallet in-app browser, or a computer with MetaMask). This is your wallet, not the Agentic Wallet. Connect, paste the agent address (it must show ✓ holds a Binance Agent ID), set the budget, caps per action and per day, the approval threshold, days valid, blocked attempts before auto-lock and the allowed services, then Create and fund."}</p>
          </Step>
          <Step n="B" title={vi ? "Duyệt lệnh lớn" : "Approve large actions"}>
            <p>{vi ? "Lệnh vượt ngưỡng sẽ thành đề xuất, hiện ở mục Waiting for your approval. Bấm Approve hoặc Reject." : "Actions above your threshold become proposals under Waiting for your approval. Approve or Reject them."}</p>
          </Step>
          <Step n="C" title={vi ? "Thu hồi và rút tiền" : "Revoke and withdraw"}>
            <p>{vi ? "Revoke dừng agent ngay (kể cả các agent con nó đã giao quyền). Withdraw all trả phần còn lại về đúng ví của bạn." : "Revoke stops the agent at once (and every sub-agent it delegated to). Withdraw all returns the rest to your own wallet."}</p>
          </Step>
          <Step n="D" title={vi ? "Giao lại cho agent con (tùy chọn)" : "Delegate to a sub-agent (optional)"}>
            <Say>{vi ? "Giao cho agent 0x… một mandate con: tối đa 0,00001 mỗi lệnh, 0,00002 mỗi ngày, 3 ngày, chỉ được mua bản tin" : "Give agent 0x… a sub-mandate: 0.00001 per action, 0.00002 per day, 3 days, notes only"}</Say>
            <p>{vi ? "Mandate con chỉ có thể hẹp hơn mandate cha, và tiền nó tiêu tính vào hạn mức của mọi cấp trên." : "A sub-mandate can only be narrower than its parent, and its spending counts against every level above it."}</p>
          </Step>
        </div>
      </section>

      <section>
        <h2 className="section-title">{vi ? <>Lỗi thường gặp</> : <>Troubleshooting</>}</h2>
        <div className="panel scroll">
          <table>
            <thead><tr><th>{vi ? "Hiện tượng" : "Symptom"}</th><th>{vi ? "Cách xử lý" : "Fix"}</th></tr></thead>
            <tbody>
              {(vi
                ? [
                    ["10002004 / AUTH_REJECTED khi đăng nhập", "Mã QR hoặc mã ghép nối hết hạn. Làm lại bước 3 từ đầu."],
                    ["351802: Developer Mode hết hạn", "Bật lại trong Binance App (bước 4)."],
                    ["351804: không bật được Developer Mode", "Số dư ví Agentic vượt mức trần. Chuyển bớt ra rồi bật lại."],
                    ["351805: mô phỏng thất bại", "Thường do hết gas hoặc lệnh không hợp lệ. Kiểm tra số dư BNB của ví Agentic."],
                    ["Refused: outside mandate", "Lệnh nằm ngoài phạm vi mandate, đó là hành vi đúng. Nếu một trang hay tin nhắn bảo làm vậy, có thể đó là bẫy."],
                    ["PENDING_CONFIRMATION", "Mở Binance App và xác nhận giao dịch trong 5 phút."],
                    ["Pool empty", "Quỹ Starter tạm hết. Báo đội, hoặc tạo mandate của riêng bạn (lối đầy đủ)."],
                    ["Web báo không có Agent ID", "Bạn dán nhầm địa chỉ. Dùng địa chỉ BSC của ví Agentic (bước 5)."],
                  ]
                : [
                    ["10002004 / AUTH_REJECTED at sign-in", "The QR or pairing code expired. Redo step 3 from the start."],
                    ["351802: Developer Mode expired", "Turn it on again in the Binance App (step 4)."],
                    ["351804: cannot enable Developer Mode", "The Agentic Wallet balance is over the cap. Move some out and retry."],
                    ["351805: simulation failed", "Usually out of gas or an invalid call. Check the Agentic Wallet BNB balance."],
                    ["Refused: outside mandate", "The action is outside the mandate; that is working as intended. If a page or message asked for it, it may be a trap."],
                    ["PENDING_CONFIRMATION", "Open the Binance App and confirm within 5 minutes."],
                    ["Pool empty", "The starter pool ran out. Tell the team, or create your own mandate (full path)."],
                    ["The site says no Agent ID", "Wrong address. Use your Agentic Wallet BSC address (step 5)."],
                  ]
              ).map(([a, b]) => <tr key={a}><td>{a}</td><td>{b}</td></tr>)}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="section-title">{vi ? <>Câu hỏi <em>thường gặp</em></> : <>Frequently asked <em>questions</em></>}</h2>
        <div className="steps three">
          {(vi
            ? [
                ["Tôi có mất tiền không?", "Chỉ phí gas nhỏ cho mỗi giao dịch bạn đồng ý. Ngân sách Starter do đội tài trợ, chỉ mua được bản tin demo, tiền mua bị đốt; không ai hưởng lợi."],
                ["Agent có tự tiêu tiền không?", "Không. Mỗi giao dịch đều được xem trước và cần bạn đồng ý, và contract còn chặn mọi lệnh ngoài phạm vi kể cả khi bạn lỡ đồng ý."],
                ["Vì sao cần hai ví?", "Lối đầy đủ tách người giao quyền (ví của bạn) và người thực thi (ví agent), để agent bị chiếm quyền không rút được tiền. Lối nhanh chỉ cần ví agent."],
                ["Ai thấy được dữ liệu của tôi?", "Mọi thứ on-chain đều công khai: địa chỉ ví, mandate, hành động. Không có tên thật hay thông tin cá nhân nào được lưu."],
                ["Dừng thế nào?", "Không làm gì nữa là dừng. Ở lối đầy đủ, bấm Revoke rồi Withdraw all."],
                ["Có admin không?", "Contract AgentMandate không có admin. StarterFaucet chỉ có ví tài trợ, được rút quỹ chưa dùng và thu hồi mandate Starter, đã công khai trong mã nguồn."],
              ]
            : [
                ["Can I lose money?", "Only small gas fees for transactions you approve. The starter budget is sponsored, can only buy demo notes, and those payments are burned; nobody profits."],
                ["Does the agent spend on its own?", "No. Every transaction is previewed and needs your yes, and the contract also blocks anything out of scope even if you approve by mistake."],
                ["Why two wallets?", "The full path separates the one who grants (your wallet) from the one who acts (the agent), so a hijacked agent cannot withdraw. The quick path needs only the agent wallet."],
                ["Who sees my data?", "Everything on-chain is public: wallet addresses, mandates, actions. No names or personal data are stored."],
                ["How do I stop?", "Just stop. On the full path, click Revoke and then Withdraw all."],
                ["Is there an admin?", "AgentMandate has none. StarterFaucet only has its sponsor, who can withdraw the unused pool and revoke starter mandates, as disclosed in the source."],
              ]
          ).map(([q, a]) => <div className="step" key={q}><h4>{q}</h4><p>{a}</p></div>)}
        </div>
      </section>
    </>
  );
}
