(function () {
    try {
        var apikey = document.currentScript.getAttribute("data-api-key");
        if (!apikey) return console.error("Intellicloud: missing data-api-key");

        fetch ("/api/collect/ip", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Client-Key": apikey
            },
            body: JSON.stringify({ page: location.href })
        }).catch(function (err) {
            console.warn("Intellicloud tracker failed:", err);
        });
    } catch (e) {
        console.warn("Intellicloud tracker error:", e);
    }
})();