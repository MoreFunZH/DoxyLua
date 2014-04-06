
process.chdir('./test');

var doxylua = require('../lib/doxylua.js'),
    fs = require('fs');

function _runTest(test, file) {
    test.equal(
        doxylua(file + '.lua'),
        fs.readFileSync(file + '.h').toString().replace(/(\r\n|\r|\n)/g, '\n'));
    test.done();
}

exports[''] = function (test) { _runTest(test, 'sample'); }
