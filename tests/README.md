# Khoebo tests

One automated script checks all 22 functional tests in the proposal (T01 to T22).

## Run it

```
npm install playwright
npx playwright install chromium
node tests/khoebo.test.js index.html tests
```

The script writes `test-log.txt` and `test-results.json`. The log starts with the SHA-256 fingerprint of the `index.html` it tested, so you can check it is the same file described in the proposal.

All data used is mock data created by the script.
