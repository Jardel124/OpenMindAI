
export class OpenMindTokenizer {
    constructor() {
        this.tokenToId = new Map([
            ["<PAD>", 0],
            ["<UNK>", 1],
            ["<BOS>", 2],
            ["<EOS>", 3]
        ]);

        this.idToToken = new Map([
            [0, "<PAD>"],
            [1, "<UNK>"],
            [2, "<BOS>"],
            [3, "<EOS>"]
        ]);
    }

    tokenize(text) {
        return String(text ?? "")
            .normalize("NFC")
            .toLocaleLowerCase("pt-BR")
            .match(/\p{L}[\p{L}\p{M}\p{N}_]*|\p{N}+|[^\s]/gu) || [];
    }

    train(texts) {
        for (const text of texts) {
            for (const token of this.tokenize(text)) {
                if (this.tokenToId.has(token)) continue;

                const id = this.tokenToId.size;

                this.tokenToId.set(token, id);
                this.idToToken.set(id, token);
            }
        }

        return this.vocabSize;
    }

    encode(text) {
        return this.tokenize(text).map(token =>
            this.tokenToId.get(token) ?? 1
        );
    }

    decode(ids) {
        const tokens = ids
            .map(id => this.idToToken.get(id) ?? "<UNK>")
            .filter(token =>
                !["<PAD>", "<BOS>", "<EOS>"].includes(token)
            );

        return tokens.join(" ")
            .replace(/\s+([.,!?;:%)\]}])/g, "$1")
            .replace(/([( \[{])\s+/g, "$1")
            .trim();
    }

    get vocabSize() {
        return this.tokenToId.size;
    }

    toJSON() {
        return Object.fromEntries(this.tokenToId);
    }

    fromJSON(data) {
        if (!data || typeof data !== "object" || Array.isArray(data)) {
            throw new Error("Vocabulário inválido.");
        }

        const entries = Object.entries(data)
            .map(([token, id]) => [token, Number(id)]);

        const ids = entries.map(([, id]) => id);

        if (
            entries.length < 4 ||
            ids.some(id => !Number.isInteger(id) || id < 0) ||
            new Set(ids).size !== ids.length ||
            !["<PAD>", "<UNK>", "<BOS>", "<EOS>"].every(
                (token, id) => data[token] === id
            )
        ) {
            throw new Error("Estrutura do vocabulário inválida.");
        }

        this.tokenToId = new Map(entries);
        this.idToToken = new Map(
            entries.map(([token, id]) => [id, token])
        );
    }
}
