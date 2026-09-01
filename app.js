const SUPABASE_URL = "https://mstpueweqspgiijpwhfm.supabase.co";
const SUPABASE_KEY = "sb_publishable_5d73Kd01jiE2IDguyNW8MA_70rhJMS5";

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


// Supabaseの匿名ユーザーを取得・作成
async function getAnonymousUser() {
  let accessToken = localStorage.getItem("supabase_access_token");
  let userId = localStorage.getItem("supabase_user_id");

  if (accessToken && userId) {
    return {
      accessToken,
      userId
    };
  }

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
    throw new Error(
      "匿名ユーザーの作成に失敗しました:\n" +
      await response.text()
    );
  }

  const data = await response.json();

  if (!data.access_token || !data.user?.id) {
    throw new Error("Supabaseの認証情報を取得できませんでした");
  }

  localStorage.setItem(
    "supabase_access_token",
    data.access_token
  );

  localStorage.setItem(
    "supabase_user_id",
    data.user.id
  );

  return {
    accessToken: data.access_token,
    userId: data.user.id
  };
}


// このiPhoneを通知先として登録
async function registerPush() {
  if (!("Notification" in window)) {
    throw new Error("Notification APIが利用できません");
  }

  if (!("serviceWorker" in navigator)) {
    throw new Error("Service Workerが利用できません");
  }

  if (!("PushManager" in window)) {
    throw new Error("Push APIが利用できません");
  }

  const name = localStorage.getItem("laundry_name");

  if (!name) {
    throw new Error("先に名前を保存してください");
  }

  const permission = await Notification.requestPermission();

  if (permission !== "granted") {
    throw new Error("通知が許可されませんでした");
  }

  const registration = await navigator.serviceWorker.ready;

  let subscription =
    await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription =
      await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey:
          urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
  }

  const subscriptionJSON = subscription.toJSON();

  if (
    !subscriptionJSON.endpoint ||
    !subscriptionJSON.keys?.p256dh ||
    !subscriptionJSON.keys?.auth
  ) {
    throw new Error("通知情報を取得できませんでした");
  }

  const auth = await getAnonymousUser();

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/push_subscriptions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${auth.accessToken}`,
        "Prefer": "resolution=merge-duplicates"
      },
      body: JSON.stringify({
        user_id: auth.userId,
        user_name: name,
        endpoint: subscriptionJSON.endpoint,
        p256dh: subscriptionJSON.keys.p256dh,
        auth: subscriptionJSON.keys.auth
      })
    }
  );

  if (!response.ok) {
    throw new Error(
      "通知先の保存に失敗しました:\n" +
      await response.text()
    );
  }

  return true;
}


// 洗濯中の人を表示
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
      const startedAt =
        new Date(item.started_at).getTime();

      return now - startedAt < LAUNDRY_TIME;
    });

    if (activeLaundry.length === 0) {
      status.textContent =
        "現在、洗濯中の人はいません";
      return;
    }

    status.innerHTML = activeLaundry
      .map(item => {
        const time =
          new Date(item.started_at)
            .toLocaleString("ja-JP");

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

    status.textContent =
      "洗濯状況を取得できませんでした";
  }
}


// 洗濯開始
button.addEventListener("click", async () => {
  const name =
    localStorage.getItem("laundry_name");

  if (!name) {
    alert("先に名前を保存してください");
    return;
  }

  button.disabled = true;
  button.textContent = "送信中...";

  try {

    // まず通知先として登録
    await registerPush();

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

    alert(error.message);

    button.textContent = "洗濯します";
    button.disabled = false;
  }
});


// 起動時
loadLaundryStatus();


// 5秒ごとに更新
setInterval(loadLaundryStatus, 5000);