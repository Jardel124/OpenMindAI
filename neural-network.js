
export class OpenMindNeuralNetwork {
    constructor(vocabSize, hiddenSize = 16, contextSize = 4) {
        this.vocabSize = vocabSize;
        this.hiddenSize = hiddenSize;
        this.contextSize = contextSize;
        this.learningRate = 0.03;

        this.embeddings = Array.from(
            { length: vocabSize },
            () => this.randomVector(hiddenSize)
        );

        this.weights = Array.from(
            { length: vocabSize },
            () => this.randomVector(hiddenSize)
        );

        this.biases = new Float64Array(vocabSize);
    }

    randomVector(size) {
        return Array.from(
            { length: size },
            () => (Math.random() * 2 - 1) * 0.1
        );
    }

    softmax(logits) {
        const max = Math.max(...logits);
        const exps = logits.map(value => Math.exp(value - max));
        const sum = exps.reduce((a, b) => a + b, 0);

        return exps.map(value => value / sum);
    }

    normalizeContext(context) {
        const ids = Array.isArray(context) ? context : [context];

        const valid = ids
            .filter(Number.isInteger)
            .map(id => id >= 0 && id < this.vocabSize ? id : 1)
            .slice(-this.contextSize);

        return valid.length ? valid : [2];
    }

    forward(context) {
        const ids = this.normalizeContext(context);
        const hidden = new Float64Array(this.hiddenSize);

        for (const id of ids) {
            const embedding = this.embeddings[id];

            for (let j = 0; j < this.hiddenSize; j++) {
                hidden[j] += embedding[j] / ids.length;
            }
        }

        const logits = new Array(this.vocabSize);

        for (let token = 0; token < this.vocabSize; token++) {
            let value = this.biases[token];

            for (let j = 0; j < this.hiddenSize; j++) {
                value += this.weights[token][j] * hidden[j];
            }

            logits[token] = value;
        }

        return {
            inputIds: ids,
            hidden,
            probabilities: this.softmax(logits)
        };
    }

    train(tokenizer, texts, epochs = 100) {
        const examples = [];

        for (const text of texts) {
            const sequence = [
                2,
                ...tokenizer.encode(text),
                3
            ];

            for (let i = 0; i < sequence.length - 1; i++) {
                examples.push({
                    context: sequence.slice(
                        Math.max(0, i - this.contextSize + 1),
                        i + 1
                    ),
                    target: sequence[i + 1]
                });
            }
        }

        if (!examples.length) {
            throw new Error("Não existem exemplos para treinamento.");
        }

        const history = [];

        for (let epoch = 0; epoch < epochs; epoch++) {
            for (let i = examples.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [examples[i], examples[j]] = [examples[j], examples[i]];
            }

            let totalLoss = 0;

            for (const { context, target } of examples) {
                const result = this.forward(context);
                const probs = result.probabilities;
                const hidden = result.hidden;

                totalLoss -= Math.log(Math.max(probs[target], 1e-12));

                const gradHidden = new Float64Array(this.hiddenSize);

                for (let token = 0; token < this.vocabSize; token++) {
                    const grad = probs[token] - (token === target ? 1 : 0);

                    for (let j = 0; j < this.hiddenSize; j++) {
                        gradHidden[j] += grad * this.weights[token][j];

                        this.weights[token][j] -=
                            this.learningRate * grad * hidden[j];
                    }

                    this.biases[token] -= this.learningRate * grad;
                }

                for (const inputId of result.inputIds) {
                    for (let j = 0; j < this.hiddenSize; j++) {
                        this.embeddings[inputId][j] -=
                            this.learningRate *
                            gradHidden[j] /
                            result.inputIds.length;
                    }
                }
            }

            history.push(totalLoss / examples.length);
        }

        return history;
    }

    predictNext(context, tokenizer, limit = 5) {
        return this.forward(context).probabilities
            .map((probability, id) => ({
                id,
                token: tokenizer.idToToken.get(id) ?? "<UNK>",
                probability
            }))
            .filter(item =>
                !["<PAD>", "<BOS>", "<UNK>"].includes(item.token)
            )
            .sort((a, b) => b.probability - a.probability)
            .slice(0, limit);
    }
}
