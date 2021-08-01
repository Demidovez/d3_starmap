var customSvgSymbols = d3.map({
  crescent: function (size, ratio) {
    var s = Math.sqrt(size),
      r = s / 2,
      ph = 0.5 * (1 - Math.cos(ratio)),
      e = 1.6 * Math.abs(ph - 0.5) + 0.01,
      dir = ratio > Math.PI ? 0 : 1,
      termdir = Math.abs(ph) > 0.5 ? dir : Math.abs(dir - 1);
    return (
      "M " +
      -1 +
      "," +
      -1 +
      " m 1," +
      (-r + 1) +
      " a" +
      r +
      "," +
      r +
      " 0 1 " +
      dir +
      " 0," +
      r * 2 +
      " a" +
      r * e +
      "," +
      r +
      " 0 1 " +
      termdir +
      " 0," +
      -(r * 2) +
      "z"
    );
  },
});
