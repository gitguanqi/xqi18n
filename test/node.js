const Xqi18n = require('../lib/xqi18n');

const xqi18 = new Xqi18n({
    lang: 'zhCn',
    messages: {
        zhCn: {
            name: '快乐'
        },
        zhHk: {
            name: '快樂'
        },
        enUs: {
            name: 'happy',
        }
    },
});

console.log('xqi18 is:', xqi18);

/*
xqi18 is: xqi18n {
    lang: 'zhCn',
    messages: {
      zhCn: { name: '快乐' },
      zhHk: { name: '快樂' },
      enUs: { name: 'happy' }
    },
    tns: [Function (anonymous)]
}
*/

const textCn = xqi18.tns('name');
console.log('text zhCN is:', textCn); // text zhCN is: 快乐
