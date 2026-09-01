const SUPABASE_URL = "https://mstpueweqspgiijpwhfm.supabase.co";
const SUPABASE_KEY = "sb_publishable_5d73Kd01jiE2IDguyNW8MA_70rhJMS5";

const button = document.getElementById("laundryButton");
const status = document.getElementById("status");

console.log("app.js loaded");
console.log("button:", button);

button.addEventListener("click", async () => {
  alert("ボタンは動いてる！");

  const name = prompt("名前を入力してください");

  if (!name) {
    return;
  }

  button.disabled = true;
  button.textContent = "送信中...";

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/laundry_status`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Prefer": "return=minimal"
        },
        body: JSON.stringify({
          user_name: name,
          status: "washing",
          started_at: new Date().toISOString()
        })
      }
    );

    if (!response.ok) {
      throw new Error(await response.text());
    }

    status.textContent = `${name}さんが洗濯中`;
    button.textContent = "洗濯中";

  } catch (error) {
    console.error(error);

    status.textContent = "エラーが発生しました";
    button.textContent = "洗濯します";
    button.disabled = false;
  }
});