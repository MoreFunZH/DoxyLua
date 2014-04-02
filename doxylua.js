/**
 * @file doxylua.js
 * @author dreamlover
 * @brief Implement a module that translate a lua file to the format that can be recognized by doxygen
 * with the wonderful package luaparse.
 */
 module.exports = function (file) {
    var fs = require('fs'),
        luaparse = require('luaparse'),
        events = new (require('events').EventEmitter);
    
    Object.keys(luaparse.ast).forEach(function (type) {
        var original = luaparse.ast[type];
        luaparse.ast[type] = function () {
            var node = original.apply(null, arguments);
            events.emit(node.type, node);
            return node;
        }
    })

    events.on('LocalStatement', function (node) {
        console.log(node);
    })
    events.on('FunctionDeclaration', function (node) {
        console.log(node);
    })
    events.on('LocalStatement', function (node) {
        console.log(node);
    })
    events.on('TableKey', function (node) {
        console.log(node);
    })

    luaparse.parse(fs.readFileSync(file).toString(), { "scope" : true })
 }