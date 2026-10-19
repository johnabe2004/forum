// ------------------------------------------------------------
// DOT PRODUCT
// ------------------------------------------------------------

const dotProduct = (vectorA, vectorB) => {
    let sum = 0;

    for (let i = 0; i < vectorA.length; i += 1) {
        sum += vectorA[i] * vectorB[i];
    }

    return sum;
};

// ------------------------------------------------------------
// MAGNITUDE (LENGTH) OF A VECTOR
// ------------------------------------------------------------
const magnitude = (vector) => {
    let sumOfSquares = 0;

    for (let i = 0; i < vector.length; i += 1) {
        sumOfSquares += vector[i] * vector[i];
    }

    return Math.sqrt(sumOfSquares);
};

// ------------------------------------------------------------
// COSINE SIMILARITY
// ------------------------------------------------------------
const cosineSimilarity = (vectorA, vectorB) => {
    if (
        !Array.isArray(vectorA) ||
        !Array.isArray(vectorB) ||
        vectorA.length === 0 ||
        vectorB.length === 0 ||
        vectorA.length !== vectorB.length
    ) {
        return 0;
    }

    const magnitudeA = magnitude(vectorA);
    const magnitudeB = magnitude(vectorB);

    if (magnitudeA === 0 || magnitudeB === 0) {
        return 0;
    }

    return dotProduct(vectorA, vectorB) / (magnitudeA * magnitudeB);
};

export { cosineSimilarity };