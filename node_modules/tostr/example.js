var tostr = require('./')
var obj = {
  str: "'A' \"string\"\r\n.",
  strO: new String("'A' \"string\" \r\nObject."),
  num: 0,
  numO: new Number(0),
  bool: true,
  boolO: new Boolean(true),
  undef: undefined,
  reg: /re/g,
  regO: new RegExp("re", "g"),
  date: new Date(),
  date2: new Date('2014-01-01'),
  arr: [1, 2, 3],
  arrO: new Array().concat([0,"1",true]),
  obj: {
    name: "fool2fish", email: "fool2fish@gmail.com"
  },
  objO: new Object(),
  func: function(a, b) {
    // some comment
    return a + b
  },
  funcO: new Function("a", "alert(a)")
}
var str = tostr(obj)
console.log(str)
