const button = document.getElementById("laundryButton");
const status = document.getElementById("status");

button.addEventListener("click", async () => {
  button.disabled = true;
  button.textContent = "送信中...";

  try {
    // 今はテスト用
    status.textContent = "洗濯中";

    button.textContent = "洗濯中";
  } catch (error) {
    console.error(error);

    status.textContent = "エラーが発生しました";
    button.textContent = "洗濯する";
    button.disabled = false;
  }
});