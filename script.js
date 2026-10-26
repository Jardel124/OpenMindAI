
(() => {
    "use strict";

    const KEYS = {
        conversations: "openmindai.conversations.v1",
        active: "openmindai.activeConversation.v1",
        model: "openmindai.modelProfile.v1",
        language: "openmindai.language.v1",
        neuralModel: "openmindai.neuralModel.v2"
    };

    const MODELS = {
        lumora: {
            name: "Lumora",
            description: "Explicações claras e passo a passo",
            instruction: "Explique conceitos de forma didática, organizada e acessível. Use exemplos quando ajudarem."
        },
        nexaris: {
            name: "Nexaris",
            description: "Precisão e objetividade",
            instruction: "Priorize respostas diretas, fatos verificáveis e incertezas explícitas. Não invente informações."
        },
        vellum: {
            name: "Vellum",
            description: "Pesquisa e comparação de fontes",
            instruction: "Priorize investigação, comparação de fontes e síntese das evidências disponíveis. Diferencie fatos de hipóteses."
        }
    };

    const TEXTS = {
        pt: {
            newChat: "＋ Nova conversa",
            settings: "⚙ Configurações",
            placeholder: "Pergunte alguma coisa...",
            welcome: "O que vamos descobrir hoje?",
            subtitle: "Converse, aprenda e explore ideias.",
            send: "Enviar",
            models: "Modelos",
            language: "Idioma",
            profile: "Seu nome",
            save: "Salvar",
            cancel: "Cancelar",
            researching: "Pesquisando fontes disponíveis...",
            success: "Pesquisa concluída",
            failed: "Não foi possível consultar algumas fontes.",
            thinking: "Pensando...",
            error: "Ocorreu um erro ao processar sua mensagem.",
            empty: "Escreva uma mensagem primeiro.",
            sources: "Fontes consultadas",
            noResults: "Não encontrei resultados relevantes nas fontes consultadas.",
            disclaimer: "O motor neural local é experimental. A pesquisa depende da disponibilidade das fontes."
        },
        en: {
            newChat: "＋ New chat",
            settings: "⚙ Settings",
            placeholder: "Ask something...",
            welcome: "What shall we discover today?",
            subtitle: "Chat, learn, and explore ideas.",
            send: "Send",
            models: "Models",
            language: "Language",
            profile: "Your name",
            save: "Save",
            cancel: "Cancel",
            researching: "Searching available sources...",
            success: "Research complete",
            failed: "Some sources could not be reached.",
            thinking: "Thinking...",
            error: "An error occurred while processing your message.",
            empty: "Write a message first.",
            sources: "Sources consulted",
            noResults: "No relevant results were found in the consulted sources.",
            disclaimer: "The local neural engine is experimental. Research depends on source availability."
        },
        es: {
            newChat: "＋ Nuevo chat",
            settings: "⚙ Configuración",
            placeholder: "Pregunta algo...",
            welcome: "¿Qué descubriremos hoy?",
            subtitle: "Conversa, aprende y explora ideas.",
            send: "Enviar",
            models: "Modelos",
            language: "Idioma",
            profile: "Tu nombre",
            save: "Guardar",
            cancel: "Cancelar",
            researching: "Buscando fuentes disponibles...",
            success: "Investigación completada",
            failed: "No se pudieron consultar algunas fuentes.",
            thinking: "Pensando...",
            error: "Ocurrió un error al procesar tu mensaje.",
            empty: "Escribe un mensaje primero.",
            sources: "Fuentes consultadas",
            noResults: "No se encontraron resultados relevantes.",
            disclaimer: "El motor neuronal local es experimental."
        }
    };

    const TRAINING_TEXTS = [
        "olá! como posso ajudar você?",
        "olá, tudo bem?",
        "meu nome é openmindai.",
        "inteligência artificial é uma área da computação.",
        "javascript é uma linguagem de programação.",
        "html estrutura o conteúdo de uma página.",
        "css define a aparência de uma página.",
        "roblox studio permite criar experiências.",
        "minecraft é um jogo de construção e exploração.",
        "um computador executa programas.",
        "a água é essencial para a vida.",
        "a matemática estuda números e relações.",
        "um exemplo ajuda a explicar uma ideia.",
        "não tenho informações suficientes para afirmar isso.",
        "posso explicar o assunto passo a passo.",
        "uma pesquisa pode consultar diferentes fontes.",
        "é importante verificar a confiabilidade das fontes.",
        "a resposta depende das informações disponíveis."
    ];

    const $ = selector => document.querySelector(selector);

    const messagesElement = $("#messages");
    const inputElement = $("#messageInput");
    const composer = $("#composer");
    const welcomeElement = $("#welcome");

    let currentModel = localStorage.getItem(KEYS.model) || "lumora";
    let language = localStorage.getItem(KEYS.language) || "pt";
    let conversations = loadJSON(KEYS.conversations, []);
    let activeId = localStorage.getItem(KEYS.active);
    let tokenizer = null;
    let network = null;
    let engineReady = false;
    let busy = false;

    if (!MODELS[currentModel]) currentModel = "lumora";
    if (!TEXTS[language]) language = "pt";

    function t(key) {
        return TEXTS[language]?.[key] ?? TEXTS.pt[key] ?? key;
    }

    function loadJSON(key, fallback) {
        try {
            const value = JSON.parse(localStorage.getItem(key));
            return value ?? fallback;
        } catch {
            return fallback;
        }
    }

    function saveConversations() {
        try {
            localStorage.setItem(KEYS.conversations, JSON.stringify(conversations));
            localStorage.setItem(KEYS.active, activeId || "");
        } catch (error) {
            console.error("Não foi possível salvar as conversas:", error);
        }
    }

    function createConversation() {
        const conversation = {
            id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
            title: "Nova conversa",
            messages: [],
            updatedAt: Date.now()
        };

        conversations.unshift(conversation);
        activeId = conversation.id;
        saveConversations();
        renderConversation();
        renderSidebar();
        return conversation;
    }

    function getActiveConversation() {
        return conversations.find(item => item.id === activeId) ?? null;
    }

    function ensureConversation() {
        return getActiveConversation() ?? createConversation();
    }

    function escapeHTML(value) {
        return String(value).replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[character]);
    }

    function formatText(value) {
        return escapeHTML(value)
            .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
            .replace(/`([^`]+)`/g, "<code>$1</code>")
            .replace(/\n/g, "<br>");
    }

    function renderSidebar() {
        const sidebar = $("#conversationList");
        if (!sidebar) return;

        sidebar.replaceChildren();

        for (const conversation of conversations) {
            const row = document.createElement("div");
            row.className = "conversation-item";
            row.dataset.id = conversation.id;

            const selectButton = document.createElement("button");
            selectButton.className = "conversation-select";
            selectButton.textContent = conversation.title || "Nova conversa";
            selectButton.addEventListener("click", () => {
                activeId = conversation.id;
                saveConversations();
                renderConversation();
                renderSidebar();
            });

            const deleteButton = document.createElement("button");
            deleteButton.className = "conversation-delete";
            deleteButton.textContent = "×";
            deleteButton.title = "Excluir conversa";
            deleteButton.addEventListener("click", () => {
                conversations = conversations.filter(item => item.id !== conversation.id);
                if (activeId === conversation.id) {
                    activeId = conversations[0]?.id ?? null;
                }
                saveConversations();
                renderConversation();
                renderSidebar();
            });

            row.append(selectButton, deleteButton);
            sidebar.append(row);
        }
    }

    function renderConversation() {
        if (!messagesElement) return;

        messagesElement.replaceChildren();
        const conversation = getActiveConversation();

        if (!conversation || conversation.messages.length === 0) {
            if (welcomeElement) welcomeElement.hidden = false;
            return;
        }

        if (welcomeElement) welcomeElement.hidden = true;

        for (const message of conversation.messages) {
            appendMessageElement(message.role, message.content, false);
        }

        messagesElement.scrollTop = messagesElement.scrollHeight;
    }

    function appendMessageElement(role, content, scroll = true) {
        if (!messagesElement) return null;

        const article = document.createElement("article");
        article.className = `message message-${role}`;

        const label = document.createElement("div");
        label.className = "message-label";
        label.textContent = role === "user" ? "Você" : "OpenMindAI";

        const body = document.createElement("div");
        body.className = "message-content";
        body.innerHTML = formatText(content);

        article.append(label, body);
        messagesElement.append(article);

        if (scroll) messagesElement.scrollTop = messagesElement.scrollHeight;

        return body;
    }

    function addMessage(role, content) {
        const conversation = ensureConversation();

        conversation.messages.push({
            role,
            content,
            timestamp: Date.now()
        });

        conversation.updatedAt = Date.now();

        if (role === "user" && conversation.messages.length === 1) {
            conversation.title = content.slice(0, 42);
        }

        saveConversations();
        appendMessageElement(role, content);
        renderSidebar();
    }

    function setStatus(message, state = "") {
        const hint = $(".composer-hint");
        if (!hint) return;

        hint.textContent = message;
        hint.dataset.networkState = state;
    }

    async function initializeEngine() {
        try {
            const [
                tokenizerModule,
                networkModule,
                storageModule
            ] = await Promise.all([
                import("./engine/tokenizer.js"),
                import("./engine/neural-network.js"),
                import("./engine/model-storage.js")
            ]);

            const TokenizerClass = tokenizerModule.OpenMindTokenizer;
            const NetworkClass = networkModule.OpenMindNeuralNetwork;
            const StorageClass = storageModule.OpenMindModelStorage;

            tokenizer = new TokenizerClass();

            const saved = localStorage.getItem(KEYS.neuralModel);

            if (saved) {
                try {
                    network = StorageClass.load(saved, tokenizer, NetworkClass);
                    engineReady = true;
                    return;
                } catch (error) {
                    console.warn("Modelo anterior incompatível; será treinado novamente.", error);
                }
            }

            tokenizer.train(TRAINING_TEXTS);

            network = new NetworkClass(tokenizer.vocabSize, 16, 4);
            network.train(tokenizer, TRAINING_TEXTS, 100);

            localStorage.setItem(
                KEYS.neuralModel,
                StorageClass.save(network, tokenizer)
            );

            engineReady = true;
        } catch (error) {
            console.error("Falha ao inicializar o motor neural:", error);
            engineReady = false;
        }
    }

    async function fetchJSON(url) {
        const response = await fetch(url, {
            headers: { Accept: "application/json" }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return response.json();
    }

    async function searchWikipedia(query) {
        const url = new URL("https://pt.wikipedia.org/w/api.php");

        url.search = new URLSearchParams({
            action: "query",
            generator: "search",
            gsrsearch: query,
            gsrlimit: "5",
            gsrnamespace: "0",
            prop: "extracts|info",
            exintro: "1",
            explaintext: "1",
            exsentences: "4",
            inprop: "url",
            format: "json",
            origin: "*"
        });

        const data = await fetchJSON(url);
        const pages = Object.values(data.query?.pages ?? {});

        return pages.map(page => ({
            source: "Wikipédia",
            title: page.title,
            extract: page.extract || "",
            url: page.fullurl || `https://pt.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, "_"))}`
        }));
    }

    async function searchWikidata(query) {
        const url = new URL("https://www.wikidata.org/w/api.php");

        url.search = new URLSearchParams({
            action: "wbsearchentities",
            search: query,
            language: language,
            uselang: language,
            limit: "5",
            type: "item",
            format: "json",
            origin: "*"
        });

        const data = await fetchJSON(url);

        return (data.search ?? []).map(item => ({
            source: "Wikidata",
            title: item.label || item.id,
            extract: item.description || "Sem descrição disponível.",
            url: item.concepturi || `https://www.wikidata.org/wiki/${item.id}`
        }));
    }

    async function searchInternet(query) {
        setStatus(t("researching"), "searching");

        const results = await Promise.allSettled([
            searchWikipedia(query),
            searchWikidata(query)
        ]);

        const sources = results
            .filter(result => result.status === "fulfilled")
            .flatMap(result => result.value);

        const failures = results.filter(result => result.status === "rejected");

        const unique = [];
        const seen = new Set();

        for (const item of sources) {
            const key = `${item.source}:${item.title.toLowerCase()}`;

            if (seen.has(key)) continue;
            seen.add(key);

            unique.push(item);
        }

        setStatus(
            failures.length === results.length ? t("failed") :
            failures.length ? t("failed") : t("success"),
            failures.length === results.length ? "error" :
            failures.length ? "error" : "success"
        );

        return unique.slice(0, 8);
    }

    function looksLikeQuestion(text) {
        return /[?]|^(quem|o que|oque|como|quando|onde|por que|porque|qual|quais|quanto|quantos|pesquise|procure|pesquisa|pesquisar|explique|define|defina|what|who|when|where|why|how|search|explain)\b/i.test(text.trim());
    }

    function shouldSearch(text) {
        return /\b(pesquise|pesquisar|pesquisa|procure|busque|na internet|fontes|notícias|noticias|atualmente|hoje|últimas|ultimas|preço|preços|lançamento|lançamento|versão mais recente|recentemente|search|look up|latest|current)\b/i.test(text)
            || (looksLikeQuestion(text) && text.trim().length > 18);
    }

    function calculateMath(text) {
        const match = text.trim().match(/^(?:quanto é\s+)?(-?\d+(?:[.,]\d+)?)\s*([+\-*/x×])\s*(-?\d+(?:[.,]\d+)?)\s*[?!.]*$/i);

        if (!match) return null;

        const a = Number(match[1].replace(",", "."));
        const b = Number(match[3].replace(",", "."));
        let result;

        switch (match[2].toLowerCase()) {
            case "+": result = a + b; break;
            case "-": result = a - b; break;
            case "*":
            case "x":
            case "×": result = a * b; break;
            case "/":
                if (b === 0) return "Não é possível dividir por zero.";
                result = a / b;
                break;
            default: return null;
        }

        return Number.isFinite(result) ? String(result) : null;
    }

    function casualReply(text) {
        const normalized = text.toLocaleLowerCase("pt-BR").trim();

        if (/^(oi|olá|ola|e aí|eai|bom dia|boa tarde|boa noite)[!. ]*$/i.test(normalized)) {
            return language === "en"
                ? "Hello! What would you like to explore?"
                : language === "es"
                    ? "¡Hola! ¿Qué te gustaría explorar?"
                    : "Olá! O que você gostaria de explorar hoje?";
        }

        if (/^(obrigado|obrigada|valeu|thanks|thank you)[!. ]*$/i.test(normalized)) {
            return language === "en" ? "You're welcome!" :
                language === "es" ? "¡De nada!" : "Por nada! 😊";
        }

        if (/\b(quem é você|qual seu nome|seu nome)\b/i.test(normalized)) {
            return `Sou o OpenMindAI, usando o perfil ${MODELS[currentModel].name}. ${MODELS[currentModel].instruction}`;
        }

        return null;
    }

    function summarizeResults(results, query) {
        if (!results.length) {
            return `${t("noResults")}\n\n${t("disclaimer")}`;
        }

        const model = MODELS[currentModel];
        let answer = "";

        if (currentModel === "lumora") {
            answer += `Vamos entender "${query}" por partes.\n\n`;
        } else if (currentModel === "nexaris") {
            answer += `Resultados disponíveis para "${query}":\n\n`;
        } else {
            answer += `Pesquisa sobre "${query}"\n\n`;
        }

        const selected = results.slice(0, 5);

        selected.forEach((item, index) => {
            answer += `${index + 1}. **${item.title}**\n`;
            if (item.extract) answer += `${item.extract}\n`;
            answer += `Fonte: ${item.source} — ${item.url}\n\n`;
        });

        answer += `\n${t("sources")}: ${[...new Set(selected.map(item => item.source))].join(", ")}.`;
        answer += `\n\nPerfil: ${model.name}. ${t("disclaimer")}`;

        return answer;
    }

    function generateLocalReply(prompt) {
        const math = calculateMath(prompt);
        if (math !== null) return math;

        const casual = casualReply(prompt);
        if (casual) return casual;

        if (!engineReady || !network || !tokenizer) {
            return language === "en"
                ? "The local language engine is unavailable. Try reloading the page."
                : "O motor neural local não está disponível. Tente recarregar a página.";
        }

        const model = MODELS[currentModel];

        if (currentModel === "lumora") {
            return `Posso ajudar a explicar esse assunto passo a passo, mas meu motor neural local ainda é limitado.\n\n${model.instruction}\n\nPara obter informações mais confiáveis, peça uma pesquisa na internet.`;
        }

        if (currentModel === "nexaris") {
            return `Não tenho dados suficientes para responder isso com precisão apenas pelo motor local.\n\n${model.instruction}\n\nTente solicitar uma pesquisa para consultar fontes disponíveis.`;
        }

        return `Ainda não consultei fontes para responder a essa pergunta.\n\n${model.instruction}\n\nPeça para eu pesquisar na internet para obter resultados e links verificáveis.`;
    }

    async function generateEngineReply(prompt) {
        const math = calculateMath(prompt);
        if (math !== null) return math;

        const casual = casualReply(prompt);
        if (casual) return casual;

        if (shouldSearch(prompt)) {
            const results = await searchInternet(prompt);
            return summarizeResults(results, prompt);
        }

        return generateLocalReply(prompt);
    }

    async function sendMessage() {
        if (busy || !inputElement) return;

        const prompt = inputElement.value.trim();

        if (!prompt) {
            setStatus(t("empty"));
            return;
        }

        busy = true;
        inputElement.value = "";
        inputElement.style.height = "";

        addMessage("user", prompt);
        const placeholder = appendMessageElement("assistant", t("thinking"));

        try {
            const reply = await generateEngineReply(prompt);

            if (placeholder) placeholder.innerHTML = formatText(reply);

            const conversation = ensureConversation();

            conversation.messages.push({
                role: "assistant",
                content: reply,
                timestamp: Date.now()
            });

            conversation.updatedAt = Date.now();
            saveConversations();
            renderSidebar();
        } catch (error) {
            console.error(error);

            const message = t("error");

            if (placeholder) placeholder.textContent = message;

            const conversation = ensureConversation();
            conversation.messages.push({
                role: "assistant",
                content: message,
                timestamp: Date.now()
            });

            saveConversations();
        } finally {
            busy = false;
            inputElement.focus();
        }
    }

    function setModel(id) {
        if (!MODELS[id]) return;

        currentModel = id;
        localStorage.setItem(KEYS.model, id);

        document.querySelectorAll("[data-openmind-model]").forEach(button => {
            button.classList.toggle("selected", button.dataset.openmindModel === id);
        });

        document.dispatchEvent(new CustomEvent("openmind:model-changed", {
            detail: { id, model: MODELS[id] }
        }));
    }

    function setLanguage(id) {
        if (!TEXTS[id]) return;

        language = id;
        localStorage.setItem(KEYS.language, id);

        document.dispatchEvent(new CustomEvent("openmind:language-changed", {
            detail: { id, texts: TEXTS[id] }
        }));
    }

    window.OpenMindAI = {
        models: MODELS,
        translations: TEXTS,
        getModel: () => currentModel,
        setModel,
        getLanguage: () => language,
        setLanguage,
        searchInternet,
        generateEngineReply,
        getConversations: () => conversations
    };

    if (composer) {
        composer.addEventListener("submit", event => {
            event.preventDefault();
            sendMessage();
        });
    }

    if (inputElement) {
        inputElement.addEventListener("keydown", event => {
            if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
            }
        });

        inputElement.addEventListener("input", () => {
            inputElement.style.height = "auto";
            inputElement.style.height = `${Math.min(inputElement.scrollHeight, 180)}px`;
        });
    }

    $("#newChatButton")?.addEventListener("click", createConversation);

    renderSidebar();
    renderConversation();
    initializeEngine();
})();
