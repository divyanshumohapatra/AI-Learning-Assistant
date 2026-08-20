import test from 'node:test';
import assert from 'node:assert';
import { chunkText, findRelevantChunks } from '../utils/textChunker.js';

test('chunkText - returns empty array for empty or blank text', () => {
    assert.deepStrictEqual(chunkText(''), []);
    assert.deepStrictEqual(chunkText('   '), []);
    assert.deepStrictEqual(chunkText(null), []);
    assert.deepStrictEqual(chunkText(undefined), []);
});

test('chunkText - splits short text into single chunk', () => {
    const text = 'Hello world, this is a test.';
    const result = chunkText(text, 10, 2);
    
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].content, 'Hello world, this is a test.');
    assert.strictEqual(result[0].chunkIndex, 0);
    assert.strictEqual(result[0].pageNumber, 0);
});

test('chunkText - splits long text into multiple chunks', () => {
    const text = 'one two three four five six seven eight nine ten';
    const result = chunkText(text, 5, 2);
    
    assert.strictEqual(result.length, 3);
    assert.strictEqual(result[0].content, 'one two three four five');
    assert.strictEqual(result[0].chunkIndex, 0);
    assert.strictEqual(result[1].content, 'four five six seven eight');
    assert.strictEqual(result[1].chunkIndex, 1);
    assert.strictEqual(result[2].content, 'seven eight nine ten');
    assert.strictEqual(result[2].chunkIndex, 2);
});

test('findRelevantChunks - returns empty array if no chunks or empty query', () => {
    assert.deepStrictEqual(findRelevantChunks([], 'query'), []);
    assert.deepStrictEqual(findRelevantChunks([{ content: 'test' }], ''), []);
    assert.deepStrictEqual(findRelevantChunks(null, 'query'), []);
});

test('findRelevantChunks - returns sorted relevant chunks', () => {
    const chunks = [
        { content: 'We are learning Javascript and building web applications.', chunkIndex: 0 },
        { content: 'Python is a great tool for data analysis and AI.', chunkIndex: 1 },
        { content: 'Cooking pasta requires boiling water first.', chunkIndex: 2 }
    ];

    const results = findRelevantChunks(chunks, 'Javascript Python coding', 3);
    
    assert.strictEqual(results.length, 2);
    assert.strictEqual(results[0].chunkIndex, 0);
    assert.strictEqual(results[1].chunkIndex, 1);
});

test('findRelevantChunks - supports mongoose-like toObject method', () => {
    const dummyMongooseDoc = {
        content: 'Docker containers make deployment simple.',
        chunkIndex: 5,
        toObject() {
            return { content: this.content, chunkIndex: this.chunkIndex };
        }
    };
    
    const results = findRelevantChunks([dummyMongooseDoc], 'Docker container', 1);
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].chunkIndex, 5);
});
