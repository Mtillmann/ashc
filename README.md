# ashc
amazon shopping history charts

1. use chrome
2. goto your order history on amazon
3. open dev tools, choose console
4. paste this code, and press enter

```
(function(){ 
  var d = document, s = d.createElement('script');
  s.setAttribute('src','https://rawgit.com/Mtillmann/ashc/master/amznchrt.js');
  d.body.appendChild(s);
})();
```
