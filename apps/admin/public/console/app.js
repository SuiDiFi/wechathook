(function (C) {
  document.querySelectorAll(".tabbar-item, .nav-item").forEach((t) => {
    t.addEventListener("click", () => C.switchTab(t.dataset.tab));
  });

  C.$("#btn-login").onclick = async () => {
    C.$("#login-err").textContent = "";
    const username = C.$("#inp-user").value.trim();
    const password = C.$("#inp-pass").value;
    const j = await C.api("/api/master/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    if (j.status !== 1) {
      C.$("#login-err").textContent = j.message || "登录失败";
      return;
    }
    C.sessionUser = j.data.username || username;
    C.setToken(j.data.token);
    C.showApp();
  };

  C.$("#inp-pass").addEventListener("keydown", (e) => {
    if (e.key === "Enter") C.$("#btn-login").click();
  });

  (async function init() {
    const token = C.getToken();
    if (!token) {
      C.showLogin();
      return;
    }
    try {
      const j = await C.api("/api/master/session");
      if (j.status === 1) {
        C.sessionUser = j.data.username || C.sessionUser;
        C.showApp();
      } else C.showLogin();
    } catch {
      C.showLogin();
    }
  })();
})(window.Console);
