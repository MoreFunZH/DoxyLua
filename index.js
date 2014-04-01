/**
 * @file index.js
 * @author dreamlover
 */

var doxylua = require('./doxylua.js')
if (require.main === module) {
    if (process.argv.length < 3) {
        console.log('NOTICE: Please provide a lua file!')
        return 
    }
    console.log(doxylua(process.argv[2]))    
}
else {
    module.exports = doxylua
}