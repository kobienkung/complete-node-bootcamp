// console.log(arguments);
// console.log(require("module").wrapper);

// module.exports
const C = require("./test-module-1");
const calc1 = new C();
console.log(calc1.add(2, 5));

// exports
const calc2 = require("./test-module-2");
console.log(calc2.add(2, 5));
const { add, multiply } = require("./test-module-2"); // module name has to be exact matched
console.log(multiply(2, 5));

// caching
require("./test-module-3")(); // module is loaded
require("./test-module-3")(); // run by cached module
require("./test-module-3")(); // run by cached module
