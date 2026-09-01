const SUPABASE_URL = "https://mstpueweqspgiijpwhfm.supabase.co";
const SUPABASE_KEY = "sb_publishable_5d73Kd01jiE2IDguyNW8MA_70rhJMS5";

// VAPID公開鍵
const VAPID_PUBLIC_KEY =
  "BEzMNc-8VbsfThPophX7yEcxkA9iazlnjlvv_jrHPCGfvGLJl7JK3Qts0eTyoqw0x1nvgQM3ZpNLB1iaU9_z5EA";

const button = document.getElementById("laundryButton");
const status = document.getElementById("status");

const LAUNDRY_TIME = 2 * 60 * 60 * 1000;


// Base64URL → Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = atob(base64);

  return Uint8Array.from(
    [...rawData].map(char => char.charCodeAt(0))
  );
}


// 匿名ユーザーを作成
async function createAnonymousUser() {
  const response = await fetch(
    `${SUPABASE_URL}/auth/v1/signup`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY
      },
      body: JSON.stringify({})
    }
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return await response.json();
}


// 通知先を登録
async function registerPush() {
  if (!("Notification" in window)) {
    throw new Error("この端末では通知機能を利用できません");
  }

  if (!("serviceWorker" in navigator)) {
    throw new Error("Service Workerに対応していません");
  }

  const permission = await Notification.requestPermission();

  if (permission !== "granted") {
    throw new Error("通知を許可してください");
  }

  const registration = await navigator.serviceWorker.ready;

  if (!registration.pushManager) {
    throw new Error("Push通知に対応していません");
  }

  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });
  }

  const subscriptionJSON = subscription.toJSON();

  const name = localStorage.getItem("laundry_name");

  if (!name) {
    throw new Error("先に名前を登録してください");
  }

  // Supabaseの匿名ユーザーを作成
  const authData = await createAnonymousUser();

  if (!authData.user || !authData.access_token) {
    throw new Error("ユーザー登録に失敗しました");
  }

  // 通知先をSupabaseへ保存
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/push_subscriptions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${authData.access_token}`,
        "Prefer": "resolution=merge-duplicates"
      },
      body: JSON.stringify({
        user_id: authData.user.id,
        user_name: name,
        endpoint: subscription.endpoint,
        p256dh: subscriptionJSON.keys.p256dh,
        auth: subscriptionJSON.keys.auth
      })
    }
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return true;
}


// 洗濯中の人を取得
async function loadLaundryStatus() {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/laundry_status?status=eq.washing&order=started_at.desc`,
      {
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

    const now = Date.now();

    const activeLaundry = data.filter(item => {
      const startedAt = new Date(item.started_at).getTime();
      return now - startedAt < LAUNDRY_TIME;
    });

    if (activeLaundry.length === 0) {
      status.textContent = "現在、洗濯中の人はいません";
      return;
    }

    status.innerHTML = activeLaundry
      .map(item => {
        const time = new Date(item.started_at).toLocaleString("ja-JP");

        return `
          <div>
            <strong>${item.user_name}</strong>さんが洗濯中
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
  const name = localStorage.getItem("laundry_name");

  if (!name) {
    alert("先に名前を登録してください");
    return;
  }

  button.disabled = true;
  button.textContent = "送信中...";

  try {
  // 通知先としてこの端末を登録
  try {
    await registerPush();
    console.log("通知先の登録に成功しました");
  } catch (error) {
    console.error("通知登録エラー:", error);
    alert("通知登録エラー:\n" + error.message);
    throw error;
  }

  // 洗濯開始を保存
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

    await loadLaundryStatus();

  } catch (error) {
    console.error(error);

    status.textContent = error.message;
    button.textContent = "洗濯します";
    button.disabled = false;
  }
});


// 初回読み込み
loadLaundryStatus();


// 5秒ごとに更新
setInterval(loadLaundryStatus, 5000);