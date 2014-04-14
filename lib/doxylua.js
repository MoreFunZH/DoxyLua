module.exports = function (file, showAST, showLocations) {
    var fs = require('fs'),
        luaparse = require('luaparse'),
        events = new (require('events').EventEmitter);

    var lastNode = { 'type' : 'DummyNode' };
    var comments = [], nodes = [], lastComment = null;
    
    // Add AST node watchers.
    // Object.keys(luaparse.ast).forEach(function (type) {
    //     var original = luaparse.ast[type];
    //     luaparse.ast[type] = function () {
    //         // The loc info of the current node has not been ready, but the last node's has.
    //         events.emit(lastNode.type, lastNode);
    //         lastNode = original.apply(null, arguments);
    //         return lastNode;
    //     }
    // })
    
    events.on('Comment', function _dealComment(node) {
        if (lastComment == null) {
            lastComment = { 
                'lines' : [ node.raw ], 
                'start' : node.loc.start.line, 
                'end' : node.loc.end.line 
            }
        } 
        else if ((node.loc.start.line - lastComment.end) == 1 &&
            _getNodeByLine(node.loc.start.line, nodes) == null) {
            lastComment.lines.push(node.raw);
            lastComment.end++;
        }
        else {
            comments.push(lastComment);
            lastComment = null;
            _dealComment(node);
        }
    });
    events.on('FunctionDeclaration', function (node) {
        if (node.isLocal != true)
            nodes.push(node);
    });
    events.on('AssignmentStatement', function (node) {
        nodes.push(node);
    });

    // Prepare to parse the file.

    // Different line endings will afftects the line number.
    var sz = fs.readFileSync(file).toString().replace(/(\r\n|\r|\n)/g, '\n');

    // Make sure it's utf8 encoding strings passed to luaparse.
    // var jschardet = require('jschardet');
    // var encodingResult = jschardet.detect(sz);
    // if (encodingResult.encoding != 'ascii') {
    //     var encoding = require('encoding');
    //     sz = encoding.convert(sz, 'utf-8', encodingResult.encoding).toString();
    // }

    // Parse the file.
    var ast = null;
    if (showAST != true) {
        ast = luaparse.parse(sz, { 'comments' : true, 'scope' : true, 'locations' : true, 'ranges' : false });
    }
    else {
        var option = { 'comments' : true, 'scope' : true, 'ranges' : false };
        if (showLocations == true) option.locations = true;
        
        ast = luaparse.parse(sz, option);
        
        require('colors');
        console.log('{'.green);
        _printAST(ast, '  ');
        console.log('}'.green)
        return '';
    }

    // Deal the outer AST nodes only.
    var body = ast.body;
    if (body != undefined) {
        for (var i = 0; i < body.length; ++i)
            events.emit(body[i].type, body[i]);
    }
    var astComments = ast.comments;
    if (astComments != undefined) {
        for (var i = 0; i < astComments.length; ++i)
            events.emit(astComments[i].type, astComments[i]);
    }

    // Don't forget the last comment node.   
    if (lastComment != null) comments.push(lastComment);

    // Check to see if the FileHeader exists.
    // FileHeader: 
    //      1. Start from the first line;
    //      2. Doesn't belong to any other node.
    var fileHeader = _getCommentByLine(1, comments);
    if (fileHeader != null) {
        var ownerNode = _getNodeByLine(fileHeader.end + 1, nodes);
        if (ownerNode == null) {
            nodes.unshift({ 
                'type' : 'FileHeader', 'file' : file, 'loc' : { 'start' : { 'line' : 2 } } });
        }
    }

    // Translate the recorded AST nodes to target format. 
    var results = nodes.map(function (node) {
        switch (node.type)
        {
        case 'FileHeader': 
            var comment = _getCommentByLine(node.loc.start.line - 1, comments);
            if (comment != null) {
                node.comment = comment.lines.map(_translateOneCommentLine);
            
                // Check to see if this comment is belong to anyother node.
                // If it is, then it's not the file header comment.
                var isFH = true;
                if (nodes.length > 1) {
                    for (var i = 1; i < nodes.length; ++i) {
                        if (nodes[i].comment == node.comment) isFH = false;
                    }
                }
                if (isFH) return _translateFileHeader(node);
                else return '';
            }
            return '';
        case 'FunctionDeclaration':
            var comment = _getCommentByLine(node.loc.start.line - 1, comments);
            if (comment != null) 
                node.comment = comment.lines.map(_translateOneCommentLine);
            return _translateFunction(node);
        case 'AssignmentStatement':
            var comment = _getCommentByLine(node.loc.start.line, comments);
            if (comment != null) {
                node.comment = comment.lines.map(_translateOneCommentLine2Endline);
                node.isEndlineComments = true;
            }
            else {
                comment = _getCommentByLine(node.loc.start.line - 1, comments);
                if (comment != null) 
                    node.comment = comment.lines.map(_translateOneCommentLine);
            }
            return _translateGlobalVariable(node, comments);
        default:
            return '';
        }
    })
    _removeEmptyItems(results);
    return results.join('\n\n');
}

function _removeEmptyItems(items) {
    if (items.length < 1) return ;
    for (var i = items.length - 1; i >= 0; --i) {
        if (items[i] == null || items[i] == '') items.splice(i, 1);
    }
}

function _translateFileHeader(node) {
    if (node.comment != null) {
        if (node.comment.length > 0) {
            node.comment.splice(node.comment.length - 1, 0, '/// @file ' + node.file);
            return node.comment.join('\n');
        }
    }
    return '';
}

function _translateFunction(node) {
    // Anonymous function shouldn't be documented.
    if (node.identifier == null)
        return '';

    var sig = [];
    if (node.isLocal) sig.push('local ');
    sig.push('function ');

    if (node.identifier.type == 'MemberExpression') {
        sig.push(node.identifier.base.name);
        sig.push(' ');
        sig.push(node.identifier.identifier.name);
    }
    else if (node.identifier.type == 'Identifier') {
        sig.push(node.identifier.name);
    }
    else {
        assert(false, 'Unknown Circumstance encountered!');
    }
    
    sig.push('(');

    if (node.parameters.length > 0) {    
        for (var i = 0; i < node.parameters.length; ++i) {
            if (node.parameters[i].name != null) {
                sig.push(node.parameters[i].name);
            }
            else if (node.parameters[i].value == '...') {
                sig.push('...');
            }
            sig.push(', ');
        }
        sig[sig.length - 1] = ');';
    }
    else {
        sig.push(');');
    }
        
    return _returnFullString(node, sig.join(''));
}

// 'comments' is used by _translateTableEnum().
function _translateGlobalVariable(node, comments) {
    // Check to see if this node is a TableEnum Structure.
    if (node.variables.length == 1 && node.init.length == 1 && 
        node.init[0].type == 'TableConstructorExpression' &&
        node.init[0].fields.length > 0) {
        return _translateTableEnum(node, comments);
    }

    var vs = [], isEndlineComments = false, endlineComments = '';
    if (node.isEndlineComments == true) {
        isEndlineComments = true;
        endlineComments = node.comment.join('\n');
    }

    for (var i = 0; i < node.variables.length; ++i) {
        var va = node.variables[i], value = node.init[i], sig = [];
        
        if (va.type == 'Identifier') {
            sig.push(va.name);
        }
        else if (va.type == 'MemberExpression') {
            sig.push(va.base.name + ' ');
            sig.push(va.identifier.name);
        }

        if (value != undefined) {
            sig.push(' = ');
            sig.push(value.raw);
        }
        
        sig.push(';');
        if (isEndlineComments == true) sig.push(' ' + endlineComments);
        
        vs.push(sig.join(''));
    }

    if (isEndlineComments == true)
        return vs.join('\n');
    else
        return _returnFullString(node, vs.join('\n'));
}

function _translateTableEnum(node, comments) {
    var lines = [];

    // First line.
    var varName = node.variables[0];
    lines.push('enum ' + varName.name + ' {');

    // Enum Fields.
    var fields = node.init[0].fields;
    for (var i = 0; i < fields.length; ++i) {
        // Field.
        var line = '';
        if (fields[i].type == 'TableValue') {
            var value = fields[i].value;
            if (value.type == 'MemberExpression') {
                line = '    ' + value.base.name + '_' + value.identifier.name + ', ';
            }
            else {
                line = '    ' + fields[i].value.raw + ', ';
            }
        }
        else if (fields[i].type == 'TableKeyString') {
            line = '    ' + fields[i].key.name + ' = ';
            var value = fields[i].value;
            if (value.type == 'MemberExpression') {
                line += (value.base.name + '.' + value.identifier.name);
            }
            else {
                line += fields[i].value.raw;
            }
            line += ', ';
        }

        // Comment
        var comment = _getCommentByLine(fields[i].loc.start.line, comments);
        if (comment != null && comment.lines != null) {
            comment = comment.lines[fields[i].loc.start.line - comment.start];
            comment = comment.replace(/^-+/, '///<');
            lines.push(line + comment);
        }
        else {
            comment = _getCommentByLine(fields[i].loc.start.line - 1, comments);
            if (comment != null && comment.lines != null) {
                for (var j = 0; j < comment.lines.length; ++j)
                    lines.push('    ' + _translateOneCommentLine(comment.lines[j]));
            }
            lines.push(line);
        }
    }

    // Last line.
    lines.push('};');

    // Add enum keyword to the comment.
    if (node.comment == null) {
        node.comment = [ '/// @enum' ];
    }
    else {
        node.comment[0] = node.comment[0].replace(/^\/+/, '/// @enum');
    }

    return _returnFullString(node, lines.join('\n'));
}

function _translateOneCommentLine(comment) {
    return comment.replace(/^-+/, '///');
}

function _translateOneCommentLine2Endline(comment) {
    return comment.replace(/^-+/, '///<');
}

function _getCommentByLine(line, comments, start, end) {
    if (comments == null || comments.length < 1) return null;

    if (start == undefined) start = 0;
    if (end == undefined) end = comments.length;
    var middle = Math.floor((start + end) / 2);

    if (start == end) return null;

    if (line < comments[middle].start) {
        if (start == middle) return null;
        return _getCommentByLine(line, comments, start, middle);
    }
    else if (line > comments[middle].end) {
        return _getCommentByLine(line, comments, middle + 1, end);
    }
    else {
        return comments[middle];
    }
}

function _getNodeByLine(line, nodes, start, end) {
    // var node = null
    // if (nodes != null) {
    //     for (var i = 0; i < nodes.length; ++i) {
    //         if (nodes[i].loc.start.line > line) break;
    //         if (nodes[i].loc.start.line <= line && line <= nodes[i].loc.end.line) {
    //             node = nodes[i];
    //             break;
    //         }
    //     }
    // }
    // return node;
    if (nodes == null || nodes.length < 1) return null;

    if (start == undefined) start = 0;
    if (end == undefined) end = nodes.length;
    var middle = Math.floor((start + end) / 2);

    if (start == end) return null;

    if (line < nodes[middle].loc.start.line) {
        if (start == middle) return null;
        return _getNodeByLine(line, nodes, start, middle);
    }
    else if (line > nodes[middle].loc.end.line) {
        return _getNodeByLine(line, nodes, middle + 1, end);
    }
    else {
        return nodes[middle];
    }
}

function _returnFullString(node, sz) {
    if (node.comment != null && node.comment.length > 0)
        return node.comment.join('\n') + '\n' + sz;
    else
        return sz;
}

function _printAST(ast, indent) {
    if (indent == undefined) indent = '';
    for (var prop in ast) {
        if (typeof ast[prop] == 'object') {
            console.log((indent + prop + ': {').green);
            _printAST(ast[prop], indent + '  ');
            console.log((indent + '}').green);
        }
        else {
            console.log((indent + prop + ': ' + ast[prop]).green);
        }
    }
}