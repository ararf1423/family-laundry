const button = document.getElementById("laundryButton");
const status = document.getElementById("status");

button.addEventListener("click", async () => {
  const name = prompt("名前を入力してください");

  if (!name) {
    return;
  }

  button.disabled = true;
  button.textContent = "送信中...";

  try {
    const response = await fetch(
      "YOUR_SUPABASE_URL/rest/v1/laundry_status",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": "YOUR_SUPABASE_ANON_KEY",
          "Authorization": "Bearer YOUR_SUPABASE_ANON_KEY",
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
      throw new Error("登録に失敗しました");
    }

    status.textContent = `${name}さんが洗濯中`;
    button.textContent = "洗濯中";

  } catch (error) {
    console.error(error);

    status.textContent = "エラーが発生しました";
    button.textContent = "洗濯する";
    button.disabled = false;
  }
});