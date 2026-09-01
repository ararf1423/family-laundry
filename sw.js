self.addEventListener("install", (event) => {
  console.log("Service Worker installed");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("Service Worker activated");
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    console.error("Push data error:", error);
  }

  const title = data.title || "洗濯のお知らせ";

  const options = {
    body: data.body || "洗濯が開始されました",
    icon: "/family-laundry/icon-192.png",
    badge: "/family-laundry/icon-192.png",
    data: {
      url: "/family-laundry/"
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow("/family-laundry/")
  );
});