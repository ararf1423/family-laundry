self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};

  const title = data.title || "洗濯のお知らせ";
  const options = {
    body: data.body || "洗濯物を干します",
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
    clients.openWindow(event.notification.data.url)
  );
});