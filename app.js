async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    alert("この端末は通知に対応していません");
    return false;
  }

  const permission = await Notification.requestPermission();

  if (permission !== "granted") {
    alert("通知を許可してください");
    return false;
  }

  return true;
}

const SUPABASE_URL = "https://mstpueweqspgiijpwhfm.supabase.co";
const SUPABASE_KEY = "sb_publishable_5d73Kd01jiE2IDguyNW8MA_70rhJMS5";

const button = document.getElementById("laundryButton");
const status = document.getElementById("status");

// 洗濯中とみなす時間（2時間）
const LAUNDRY_TIME = 2 * 60 * 60 * 1000;


// 洗濯中の人を取得
async function loadLaundryStatus() {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/laundry_status?status=eq.washing&order=started_at.desc`,
      {
        method: "GET",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const data = await response.json();

    // 現在時刻
    const now = Date.now();

    // 2時間以内に開始された洗濯だけ残す
    const activeLaundry = data.filter(item => {
      const startedAt = new Date(item.started_at).getTime();

      return now - startedAt < LAUNDRY_TIME;
    });

    // 洗濯中の人がいない場合
    if (activeLaundry.length === 0) {
      status.textContent = "現在、洗濯中の人はいません";
      return;
    }

    // 洗濯中の人を表示
    status.innerHTML = activeLaundry
      .map(item => {
        const time = new Date(item.started_at).toLocaleString("ja-JP");

        return `
          <div>
            🧺 <strong>${item.user_name}</strong>さんが洗濯中
            <br>
            <small>開始：${time}</small>
          </div>
        `;
      })
      .join("<hr>");

  } catch (error) {
    console.error(error);
    status.textContent = "洗濯状況を取得できませんでした";
  }
}


// 洗濯ボタン
button.addEventListener("click", async () => {
   
  const notificationOK = await requestNotificationPermission();

  if (!notificationOK) {
     return;
  }
   
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

    button.textContent = "洗濯中";

    // 保存後、最新の状態を表示
    await loadLaundryStatus();

  } catch (error) {
    console.error(error);

    status.textContent = "エラーが発生しました";
    button.textContent = "洗濯する";
    button.disabled = false;
  }
});


// ページを開いた時に取得
loadLaundryStatus();


// 5秒ごとに最新状態を確認
setInterval(loadLaundryStatus, 5000);