
process.chdir('./test');

var doxylua = require('../lib/doxylua.js'),
    fs = require('fs');

function _runTest(test, file) {
    test.equal(
        doxylua(file + '.lua'),
        fs.readFileSync(file + '.h').toString().replace(/(\r\n|\r|\n)/g, '\n'));
    test.done();
}

exports['runAllTests'] = function (test) { 
    var files = fs.readdirSync('./');
    for (var i = 0; i < files.length; ++i) {
        var fn = files[i].match(/(.+)\.lua$/);
        if (fn != null) _runTest(test, fn[1]);
    }
}
