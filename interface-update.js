
(() => {
    "use strict";

    function initialize() {
        const api = window.OpenMindAI;
        if (!api) return;

        const $ = selector => document.querySelector(selector);
        const body = document.body;

        const oldModelButton = $("#modelSelectorButton");
        const oldModelDialog = $("#modelSelectorDialog");
        const oldSettingsDialog = $("#openMindSettingsDialog");

        oldModelButton?.remove();
        oldModelDialog?.remove();
        oldSettingsDialog?.remove();

        const modelButton = document.createElement("button");
        modelButton.id = "modelSelectorButton";
        modelButton.className = "model-selector-button";
        modelButton.type = "button";

        const modelDialog = document.createElement("div");
        modelDialog.id = "modelSelectorDialog";
        modelDialog.className = "model-dialog";
        modelDialog.hidden = true;

        const settingsDialog = document.createElement("div");
        settingsDialog.id = "openMindSettingsDialog";
        settingsDialog.className = "model-dialog";
        settingsDialog.hidden = true;

        function closeDialogs() {
            modelDialog.hidden = true;
            settingsDialog.hidden = true;
        }

        function getLanguage() {
            return api.getLanguage();
        }

        function getText(pt, en, es) {
            const lang = getLanguage();
            return lang === "en" ? en : lang === "es" ? es : pt;
        }

        function renderModels() {
            const lang = getLanguage();

            modelDialog.innerHTML = `
                <div class="model-dialog-backdrop" data-close-models></div>
                <section class="model-dialog-panel"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="modelDialogTitle">

                    <div class="model-dialog-heading">
                        <div>
                            <h2 id="modelDialogTitle">
                                ${getText("Escolha seu modelo", "Choose your model", "Elige tu modelo")}
                            </h2>
                            <p>
                                ${getText("Cada modelo tem um estilo de resposta.", "Each model has its own response style.", "Cada modelo tiene su propio estilo de respuesta.")}
                            </p>
                        </div>
                        <button type="button" class="model-dialog-close" data-close-models aria-label="Close">×</button>
                    </div>

                    <div class="model-options">
                        ${Object.entries(api.models).map(([id, model]) => `
                            <button type="button"
                                class="model-option ${api.getModel() === id ? "selected" : ""}"
                                data-openmind-model="${id}">
                                <span class="model-option-icon">
                                    ${id === "lumora" ? "✦" : id === "nexaris" ? "◎" : "⌕"}
                                </span>
                                <span class="model-option-copy">
                                    <strong>${model.name}</strong>
                                    <small>${model.description}</small>
                                </span>
                                <span class="model-option-check">✓</span>
                            </button>
                        `).join("")}
                    </div>

                    <p class="model-dialog-note">
                        ${getText(
                            "Os perfis compartilham o mesmo motor experimental.",
                            "These profiles share the same experimental engine.",
                            "Estos perfiles comparten el mismo motor experimental."
                        )}
                    </p>
                </section>
            `;

            modelDialog.querySelectorAll("[data-close-models]").forEach(element => {
                element.addEventListener("click", () => {
                    modelDialog.hidden = true;
                });
            });

            modelDialog.querySelectorAll("[data-openmind-model]").forEach(button => {
                button.addEventListener("click", () => {
                    api.setModel(button.dataset.openmindModel);
                    renderModels();
                    updateModelButton();
                    modelDialog.hidden = true;
                });
            });
        }

        function renderSettings() {
            settingsDialog.innerHTML = `
                <div class="model-dialog-backdrop" data-close-settings></div>
                <section class="model-dialog-panel settings-panel"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="settingsTitle">

                    <div class="model-dialog-heading">
                        <div>
                            <h2 id="settingsTitle">
                                ${getText("Configurações", "Settings", "Configuración")}
                            </h2>
                            <p>
                                ${getText("Personalize sua interface.", "Customize your interface.", "Personaliza tu interfaz.")}
                            </p>
                        </div>
                        <button type="button" class="model-dialog-close" data-close-settings aria-label="Close">×</button>
                    </div>

                    <label class="settings-label" for="openMindLanguage">
                        ${getText("Idioma", "Language", "Idioma")}
                    </label>

                    <select id="openMindLanguage" class="settings-select">
                        <option value="pt">Português</option>
                        <option value="en">English</option>
                        <option value="es">Español</option>
                    </select>

                    <p class="model-dialog-note">
                        ${getText(
                            "A tradução cobre os principais elementos da interface.",
                            "Translations cover the main interface elements.",
                            "La traducción cubre los principales elementos de la interfaz."
                        )}
                    </p>
                </section>
            `;

            settingsDialog.querySelectorAll("[data-close-settings]").forEach(element => {
                element.addEventListener("click", () => {
                    settingsDialog.hidden = true;
                });
            });

            const select = $("#openMindLanguage");
            select.value = api.getLanguage();

            select.addEventListener("change", () => {
                api.setLanguage(select.value);
                applyTranslations();
                renderModels();
                renderSettings();
                updateModelButton();
            });
        }

        function updateModelButton() {
            const model = api.models[api.getModel()];
            modelButton.textContent = `✧ ${model ? model.name : "Lumora"}`;
        }

        function applyTranslations() {
            const texts = api.translations[api.getLanguage()];
            if (!texts) return;

            const newChat = $("#newChatButton");
            const input = $("#messageInput");
            const welcomeTitle = $("#welcome h1");
            const welcomeText = $("#welcome p");
            const sendButton = $("#sendButton");
            const aboutButton = $("#aboutButton");

            if (newChat) newChat.textContent = texts.newChat;
            if (input) input.placeholder = texts.placeholder;
            if (welcomeTitle) welcomeTitle.textContent = texts.welcome;
            if (welcomeText) welcomeText.textContent = texts.subtitle;
            if (sendButton) sendButton.textContent = texts.send;
            if (aboutButton) aboutButton.textContent = texts.settings;

            updateModelButton();
        }

        modelButton.addEventListener("click", () => {
            settingsDialog.hidden = true;
            modelDialog.hidden = false;
        });

        const header = $("header") ||
            $(".topbar") ||
            $(".app-header") ||
            $(".chat-header");

        const sidebar = $(".sidebar");

        if (header) {
            header.appendChild(modelButton);
        } else if (sidebar) {
            sidebar.prepend(modelButton);
        } else {
            body.prepend(modelButton);
        }

        body.append(modelDialog, settingsDialog);

        const aboutButton = $("#aboutButton");

        if (aboutButton) {
            aboutButton.textContent = api.translations[getLanguage()].settings;

            aboutButton.addEventListener("click", event => {
                event.preventDefault();
                event.stopPropagation();

                modelDialog.hidden = true;
                settingsDialog.hidden = false;
            });
        }

        document.addEventListener("keydown", event => {
            if (event.key === "Escape") closeDialogs();
        });

        document.addEventListener("openmind:model-changed", () => {
            updateModelButton();
            renderModels();
        });

        document.addEventListener("openmind:language-changed", () => {
            applyTranslations();
            renderModels();
            renderSettings();
        });

        renderModels();
        renderSettings();
        updateModelButton();
        applyTranslations();
    }

    function waitForAPI() {
        if (window.OpenMindAI) {
            initialize();
        } else {
            setTimeout(waitForAPI, 50);
        }
    }

    waitForAPI();
})();
