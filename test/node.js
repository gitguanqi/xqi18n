// Small runnable demo for Node. Kept as `npm run test:node` because the old
// README pointed at this path; it now asserts instead of only printing.

const assert = require('node:assert/strict');

const Xqi18n = require('../index.js');

const i18n = new Xqi18n({
    lang: 'zhCn',
    messages: {
        zhCn: { name: '快乐', nav: { home: '首页' } },
        zhHk: { name: '快樂', nav: { home: '首頁' } },
        enUs: { name: 'happy', nav: { home: 'Home' } },
    },
});

assert.equal(i18n.tns('name'), '快乐');
assert.equal(i18n.tns('nav.home'), '首页');

i18n.lang = 'enUs';
assert.equal(i18n.tns('name'), 'happy');

// A missing key returns the key itself and warns once.
const missing = i18n.tns('nope');
assert.equal(missing, 'nope');

console.log('xqi18n demo ok — lang:', i18n.lang, '| name:', i18n.tns('name'), '| missing:', missing);
