
export class OpenMindModelStorage {
    static VERSION = 2;
    static TRAINING_VERSION = "openmind-training-v2";

    static save(network, tokenizer) {
        return JSON.stringify({
            version: this.VERSION,
            trainingVersion: this.TRAINING_VERSION,
            vocab: tokenizer.toJSON(),
            vocabSize: network.vocabSize,
            hiddenSize: network.hiddenSize,
            contextSize: network.contextSize,
            learningRate: network.learningRate,
            embeddings: network.embeddings,
            weights: network.weights,
            biases: Array.from(network.biases)
        });
    }

    static load(json, tokenizer, NetworkClass) {
        const model = JSON.parse(json);

        if (
            model.version !== this.VERSION ||
            model.trainingVersion !== this.TRAINING_VERSION ||
            !Number.isInteger(model.vocabSize) ||
            !Number.isInteger(model.hiddenSize) ||
            !Number.isInteger(model.contextSize) ||
            model.contextSize < 1 ||
            !Number.isFinite(model.learningRate) ||
            model.learningRate <= 0 ||
            !Array.isArray(model.vocab) ||
            !Array.isArray(model.embeddings) ||
            !Array.isArray(model.weights) ||
            !Array.isArray(model.biases) ||
            model.embeddings.length !== model.vocabSize ||
            model.weights.length !== model.vocabSize ||
            model.biases.length !== model.vocabSize
        ) {
            throw new Error("Modelo incompatível. É necessário treinar novamente.");
        }

        const validRows = rows =>
            rows.every(row =>
                Array.isArray(row) &&
                row.length === model.hiddenSize &&
                row.every(Number.isFinite)
            );

        if (
            !validRows(model.embeddings) ||
            !validRows(model.weights) ||
            !model.biases.every(Number.isFinite)
        ) {
            throw new Error("Os pesos do modelo são inválidos.");
        }

        const newTokenizer = new tokenizer.constructor();
        newTokenizer.fromJSON(model.vocab);

        if (newTokenizer.vocabSize !== model.vocabSize) {
            throw new Error("Vocabulário incompatível com os pesos.");
        }

        tokenizer.fromJSON(model.vocab);

        const network = new NetworkClass(
            model.vocabSize,
            model.hiddenSize,
            model.contextSize
        );

        network.learningRate = model.learningRate;
        network.embeddings = model.embeddings;
        network.weights = model.weights;
        network.biases = Float64Array.from(model.biases);

        return network;
    }

    static download(json, filename = "openmind-model.json") {
        const blob = new Blob([json], {
            type: "application/json"
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = filename;
        link.click();

        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
}
