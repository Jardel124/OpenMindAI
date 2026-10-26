
export function generateText(
    network,
    tokenizer,
    prompt,
    maxTokens = 30,
    temperature = 0.8
) {
    const promptIds = tokenizer.encode(prompt);
    const output = [...promptIds];

    let context = [
        2,
        ...promptIds
    ].slice(-network.contextSize);

    temperature = Math.max(0.1, Math.min(2, temperature));

    for (let i = 0; i < maxTokens; i++) {
        const predictions = network.forward(context).probabilities;

        let nextId = 3;
        let bestScore = -Infinity;

        for (let id = 0; id < predictions.length; id++) {
            const token = tokenizer.idToToken.get(id);

            if (
                !token ||
                ["<PAD>", "<BOS>", "<UNK>"].includes(token)
            ) {
                continue;
            }

            const probability = Math.max(predictions[id], 1e-12);
            const score = Math.log(probability) / temperature
                - Math.log(-Math.log(Math.max(Math.random(), 1e-12)));

            if (score > bestScore) {
                bestScore = score;
                nextId = id;
            }
        }

        const nextToken = tokenizer.idToToken.get(nextId);

        if (!nextToken || nextToken === "<EOS>") {
            break;
        }

        output.push(nextId);
        context = [...context, nextId].slice(-network.contextSize);
    }

    return tokenizer.decode(output);
}
