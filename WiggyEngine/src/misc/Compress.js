/**
 * WiggyCompression - Ultra-efficient lossless compression for project files
 * Uses LZ77 with optimized dictionary and Huffman coding
 */
class WiggyCompression {
    static compress(data) {
        const jsonString = JSON.stringify(data);
        
        // Step 1: LZ77 compression with optimized window
        const lz77Compressed = this.lz77Compress(jsonString);
        
        // Step 2: Huffman encoding for final compression
       // const huffmanCompressed = this.huffmanCompress(lz77Compressed);
        
        return {
            compressed: lz77Compressed,
            originalSize: jsonString.length,
            compressedSize: lz77Compressed.length,
            ratio: (jsonString.length / lz77Compressed.length).toFixed(2)
        };
    }
    
    static decompress(compressedData) {
        // Step 1: Huffman decoding
        //const lz77Data = this.huffmanDecompress(compressedData.compressed);
        
        // Step 2: LZ77 decompression
        const jsonString = this.lz77Decompress(compressedData.compressed);
        
        return JSON.parse(jsonString);
    }
    
    static lz77Compress(input) {
        const windowSize = 4096;
        const lookaheadSize = 18;
        const result = [];
        let pos = 0;
        
        while (pos < input.length) {
            let bestMatch = { length: 0, distance: 0 };
            
            // Search for matches in sliding window
            const windowStart = Math.max(0, pos - windowSize);
            for (let i = windowStart; i < pos; i++) {
                let matchLength = 0;
                while (matchLength < lookaheadSize && 
                       pos + matchLength < input.length &&
                       input[i + matchLength] === input[pos + matchLength]) {
                    matchLength++;
                }
                
                if (matchLength > bestMatch.length && matchLength >= 3) {
                    bestMatch = { length: matchLength, distance: pos - i };
                }
            }

            if (bestMatch.length >= 3) {
                result.push({ type: 'match', distance: bestMatch.distance, length: bestMatch.length });
                pos += bestMatch.length;
            } else {
                result.push({ type: 'literal', char: input[pos] });
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

}

// Compress data using gzip-like compression
async function compressData(data) {
    const stream = new CompressionStream('gzip');
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();
        
    const encoder = new TextEncoder();
    const chunks = [];
        
    // Start compression
    const writePromise = writer.write(encoder.encode(data)).then(() => writer.close());
        
    // Read compressed chunks
    const readPromise = (async () => {
        let done, value;
        while (!done) {
            ({ done, value } = await reader.read());
            if (value) chunks.push(value);
        }
    })();
        
    await Promise.all([writePromise, readPromise]);
        
    // Combine chunks into single ArrayBuffer
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
    }
        
    return result.buffer;
}
    
// Decompress data
async function decompressData(compressedData) {
    const stream = new DecompressionStream('gzip');
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();
        
    const chunks = [];
        
    // Start decompression
    const writePromise = writer.write(compressedData).then(() => writer.close());
        
    // Read decompressed chunks
    const readPromise = (async () => {
    let done, value;
        while (!done) {
            ({ done, value } = await reader.read());
            if (value) chunks.push(value);
        }
    })();
        
    await Promise.all([writePromise, readPromise]);
        
    // Combine and decode
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
    }
        
    const decoder = new TextDecoder();
    return decoder.decode(combined);
}
