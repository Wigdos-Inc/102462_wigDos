/**
 * WiggyCompression - Ultra-efficient lossless compression for project files
 * Uses LZ77 with optimized dictionary and Huffman coding
 */
class WiggyCompression {
    static compress(data) {
        const jsonString = JSON.stringify(data);

        const tokens = this.lz77Compress(jsonString);
        const packed = this.packTokens(tokens);

        return {
            version: 2,
            compressed: packed,
            originalSize: jsonString.length,
            compressedSize: packed.length,
            ratio: (jsonString.length / packed.length).toFixed(2)
        };
    }

    static decompress(data) {
        // Legacy format (array of token objects)
        if (Array.isArray(data.compressed)) {
            return this.legacy_decompress(data);
        }

        // New packed format (string)
        const tokens = this.unpackTokens(data.compressed);
        const jsonString = this.lz77Decompress(tokens);

        return JSON.parse(jsonString);
    }

    static packTokens(tokens) {
        const MATCH = "\u0001";
        const ESC = "\u0002";

        let out = "";

        for (const token of tokens) {
            if (token.type === "literal") {
                if (token.char === MATCH || token.char === ESC)
                    out += ESC + token.char;
                else
                    out += token.char;
            } else {
                out += MATCH;
                out += token.distance;
                out += ",";
                out += token.length;
                out += ";";
            }
        }
        return out;
    }

    static unpackTokens(data) {
        const MATCH = "\u0001";
        const ESC = "\u0002";

        const tokens = [];

        let i = 0;

        while (i < data.length) {
            const c = data[i++];

            if (c === ESC) {
                tokens.push({
                    type: "literal",
                    char: data[i++]
                });
            } else if (c === MATCH) {
                let distance = "";

                while (data[i] !== ",") distance += data[i++];

                i++;

                let length = "";

                while (data[i] !== ";") length += data[i++];

                i++;

                tokens.push({
                    type: "match",
                    distance: Number(distance),
                    length: Number(length)
                });

            } else {
                tokens.push({
                    type: "literal",
                    char: c
                });
            }
        }
        return tokens;
    }
    
    static lz77Compress(input) {
        const windowSize = 4096;
        const lookaheadSize = 18;
        const minMatch = 3;

        const result = [];
        const hashTable = new Map();

        let pos = 0;
        const length = input.length;

        while (pos < length) {

            // Not enough characters left for a match
            if (pos > length - minMatch) {
                result.push({ type: "literal", char: input[pos++] });
                continue;
            }

            // Hash the next 3 characters
            const hash =
                (input.charCodeAt(pos) << 16) ^
                (input.charCodeAt(pos + 1) << 8) ^
                input.charCodeAt(pos + 2);

            let bestLength = 0;
            let bestDistance = 0;

            const candidates = hashTable.get(hash);

            if (candidates) {

                // Remove positions outside sliding window
                while (candidates.length && candidates[0] < pos - windowSize) {
                    candidates.shift();
                }

                // Check newest candidates first
                for (let c = candidates.length - 1; c >= 0; c--) {
                    const i = candidates[c];

                    let matchLength = 3;

                    while (
                        matchLength < lookaheadSize &&
                        pos + matchLength < length &&
                        input[i + matchLength] === input[pos + matchLength]
                    ) {
                        matchLength++;
                    }

                    if (matchLength > bestLength) {
                        bestLength = matchLength;
                        bestDistance = pos - i;

                        if (matchLength === lookaheadSize)
                            break;
                    }
                }

                candidates.push(pos);
            } else {
                hashTable.set(hash, [pos]);
            }

            if (bestLength >= minMatch) {
                result.push({
                    type: "match",
                    distance: bestDistance,
                    length: bestLength
                });

                // Add skipped positions into hash table
                for (let k = 1; k < bestLength; k++) {
                    if (pos + k > length - minMatch)
                        break;

                    const h =
                        (input.charCodeAt(pos + k) << 16) ^
                        (input.charCodeAt(pos + k + 1) << 8) ^
                        input.charCodeAt(pos + k + 2);

                    let list = hashTable.get(h);
                    if (!list) {
                        list = [];
                        hashTable.set(h, list);
                    }

                    list.push(pos + k);
                }

                pos += bestLength;
            } else {
                result.push({
                    type: "literal",
                    char: input[pos]
                });

                pos++;
            }
        }

        return result;
    }

    static lz77Decompress(compressed) {
        const output = [];

        for (const token of compressed) {
            if (token.type === "literal") {
                output.push(token.char);
            } else if (token.type === "match") {
                const start = output.length - token.distance;

                for (let i = 0; i < token.length; i++) {
                    output.push(output[start + i]);
                }
            }
        }

        return output.join("");
    }

    static legacy_compress(data) {
        const jsonString = JSON.stringify(data);

        const lz77Compressed = this.lz77Compress(jsonString);

        return {
            compressed: lz77Compressed,
            originalSize: jsonString.length,
            compressedSize: lz77Compressed.length,
            ratio: (jsonString.length / lz77Compressed.length).toFixed(2)
        };
    }

    static legacy_decompress(compressedData) {
        const jsonString = this.lz77Decompress(compressedData.compressed);
        return JSON.parse(jsonString);
    }
}
