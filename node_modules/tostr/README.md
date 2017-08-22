# tostr

Convert object to string.

## Usage

**NOTE: did not handle the circular**

input

```
var tostr = require('tostr')
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

```

output

```
{
  str: '\'A\' "string"\r\n.',
  strO: '\'A\' "string" \r\nObject.',
  num: 0,
  numO: 0,
  bool: true,
  boolO: true,
  undef: undefined,
  reg: /re/g,
  regO: /re/g,
  date: new Date('Mon Dec 22 2014 16:09:46 GMT+0800 (CST)'),
  date2: new Date('Wed Jan 01 2014 08:00:00 GMT+0800 (CST)'),
  arr: [
    1,
    2,
    3
  ],
  arrO: [
    0,
    '1',
    true
  ],
  obj: {
    name: 'fool2fish',
    email: 'fool2fish@gmail.com'
  },
  objO: {
  },
  func: function (a, b) {
    // some comment
    return a + b
  },
  funcO: function anonymous(a
/**/) {
alert(a)
}
}

```

