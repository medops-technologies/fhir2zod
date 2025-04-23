import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { Readable } from 'node:stream';
import { resolve } from 'node:path';

export const loadNdjsonFile = (path: string): Readable => {
    // Create a readable stream from the file
    const absolutePath = resolve(path);
    const fileStream = createReadStream(absolutePath, { encoding: 'utf8' });

    // Create a readable stream that will contain parsed JSON objects
    const outputStream = new Readable({ objectMode: true });
    outputStream._read = () => { }; // Required implementation

    // Use readline to process the file line by line
    const rl = createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    // For each line in the file
    rl.on('line', (line: string) => {
        try {
            // Skip empty lines
            if (line.trim() === '') return;

            // Parse the JSON and push it to the output stream
            const parsedJson = JSON.parse(line);
            outputStream.push(parsedJson);
        } catch (error) {
            // In case of parsing error, emit an error on the output stream
            outputStream.emit('error', new Error(`Failed to parse JSON line: ${line}`));
        }
    });

    // When the file is completely read
    rl.on('close', () => {
        // Signal the end of the stream
        outputStream.push(null);
    });

    // If there's an error reading the file
    fileStream.on('error', (error: NodeJS.ErrnoException) => {
        outputStream.emit('error', error);
    });

    return outputStream;
};
