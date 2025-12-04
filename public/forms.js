(function() {
    const token = document.currentScript.getAttribute("data-token");
    if (!token) {
        console.error("Eduvanca Forms Error: Missing data-token in script tag");
        return;
    }

    async function submitToEduvanca(form, data) {
        try {
            const response = await fetch(
                "https://rhyfirodiwsjdqffhzab.supabase.co/functions/v1/create-lead-from-form", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        signed_token: token,
                        form_name: form.getAttribute("data-form-name") || "Website Form",
                        data,
                    }),
                }
            );

            const result = await response.json();
            if (!result.success) {
                console.error("Eduvanca Form Submission Error:", result.error);
            } else {
                console.log("Eduvanca CRM: Lead submitted successfully");
            }
        } catch (err) {
            console.error("Eduvanca Error:", err);
        }
    }

    document.addEventListener("submit", function(e) {
        const form = e.target;
        if (!form.matches("form")) return;

        const data = Object.fromEntries(new FormData(form).entries());
        submitToEduvanca(form, data);
    });
})();