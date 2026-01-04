// Main application logic


// ===== PAGE DISPLAY =====
function showPage(pageName) {
    if (document.body.classList.contains("admin-layout")) {
        if (typeof showAdminPage === "function") {
            showAdminPage(pageName);
        }
        return;
    }

    if (document.body.classList.contains("user-layout")) {
        if (typeof showUserPage === "function") {
            showUserPage(pageName);
        }
        return;
    }
}

// ===== NAVIGATION CLICK =====
document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-page]").forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();

            const page = link.dataset.page;

            if (!getToken()) {
                window.location.href = "user.html#login";
                return;
            }

            window.location.hash = page;
            showPage(page);
        });
    });
});

// ===== EXPORT =====
window.showPage = showPage;
