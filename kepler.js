var gmdat = {
  sol: 0.0002959122082855911025,
  mer: 164468599544771,
  ven: 2425056445892137,
  ter: 2975536307796296,
  lun: 36599199229256,
  mar: 319711652803400,
  cer: 467549107200,
  ves: 129071530155,
  jup: 945905718740635000,
  sat: 283224952705891000,
  ura: 43256077238632300,
  nep: 51034401552155700,
  plu: 7327611364884,
  eri: 8271175680000,
};

var kelements = [
  "a",
  "e",
  "i",
  "w",
  "M",
  "L",
  "W",
  "N",
  "n",
  "ep",
  "ref",
  "lecl",
  "becl",
  "Tilt",
];

var Trig = {
  sinh: function (val) {
    return (Math.pow(Math.E, val) - Math.pow(Math.E, -val)) / 2;
  },
  cosh: function (val) {
    return (Math.pow(Math.E, val) + Math.pow(Math.E, -val)) / 2;
  },
  tanh: function (val) {
    return 2.0 / (1.0 + Math.exp(-2.0 * val)) - 1.0;
  },
  asinh: function (val) {
    return Math.log(val + Math.sqrt(val * val + 1));
  },
  acosh: function (val) {
    return Math.log(val + Math.sqrt(val * val - 1));
  },
  normalize0: function (val) {
    return ((val + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  },
  normalize: function (val) {
    return (val + Math.PI * 2) % (Math.PI * 2);
  },
  cartesian: function (p) {
    var ϕ = p[0],
      θ = halfπ - p[1],
      r = p[2];
    return {
      x: r * Math.sin(θ) * Math.cos(ϕ),
      y: r * Math.sin(θ) * Math.sin(ϕ),
      z: r * Math.cos(θ),
    };
  },
  spherical: function (p) {
    var r = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z),
      θ = Math.atan(p.y / p.x),
      ϕ = Math.acos(p.z / r);
    return [θ / deg2rad, ϕ / deg2rad, r];
  },
  distance: function (p1, p2) {
    return Math.acos(
      Math.sin(p1[1]) * Math.sin(p2[1]) +
        Math.cos(p1[1]) * Math.cos(p2[1]) * Math.cos(p1[0] - p2[0])
    );
  },
};

var Kepler = function () {
  var gm = gmdat.sol,
    parentBody = "sol",
    elem = {},
    dat = {},
    id,
    name,
    symbol;

  function kepler(date) {
    dates(date);
    if (id === "sol") {
      dat.ephemeris.x = 0;
      dat.ephemeris.y = 0;
      dat.ephemeris.z = 0;
      dat.ephemeris.mag = -6;
      return kepler;
    }
    coordinates();
    return kepler;
  }

  var dates = function (date) {
    var dt,
      de = (dat.ephemeris = {});
    if (date) {
      if (date instanceof Date) {
        dt = new Date(date.valueOf());
      } else {
        dt = dateParse(date);
      }
    }
    if (!dt) {
      dt = new Date();
    }
    de.jd = JD(dt);

    dt = dateParse(elem.ep);
    if (!dt) dt = dateParse("2000-01-01");
    de.jd0 = JD(dt);
    de.d = de.jd - de.jd0;
    de.cy = de.d / 36525;
  };

  var coordinates = function () {
    var key,
      de = dat.ephemeris;
    if (id === "lun") {
      de = moon_elements(de);
      if (!de) return;
    } else {
      for (var i = 0; i < kelements.length; i++) {
        key = kelements[i];
        if (!has(elem, key)) continue;
        if (has(elem, "d" + key)) {
          de[key] = elem[key] + elem["d" + key] * de.cy;
        } else if (has(elem, key)) {
          de[key] = elem[key];
        }
      }
      if (has(de, "M") && !has(de, "dM") && has(de, "n")) {
        de.M += de.n * de.d;
      }
    }
    derive();
    trueAnomaly();
    cartesian();
  };

  kepler.cartesian = function () {
    return dat;
  };

  kepler.spherical = function () {
    spherical();
    return dat;
  };

  kepler.equatorial = function (pos) {
    equatorial(pos);
    return dat;
  };

  kepler.transpose = function () {
    transpose(dat);
    return dat;
  };

  kepler.elements = function (_) {
    var key;

    if (!arguments.length || arguments[0] === undefined) return kepler;

    for (var i = 0; i < kelements.length; i++) {
      key = kelements[i];
      if (!has(_, key)) continue;
      elem[key] = _[key];

      if (key === "a" || key === "e") elem[key] *= 1.0;
      else if (key !== "ref" && key !== "ep") elem[key] *= deg2rad;

      if (has(_, "d" + key)) {
        key = "d" + key;
        elem[key] = _[key];
        if (key === "da" || key === "de") elem[key] *= 1.0;
        else elem[key] *= deg2rad;
      }
    }
    return kepler;
  };

  kepler.params = function (_) {
    if (!arguments.length) return kepler;
    for (var par in _) {
      if (!has(_, par)) continue;
      if (_[par] === "elements") continue;
      dat[par] = _[par];
    }
    return kepler;
  };

  kepler.parentBody = function (_) {
    if (!arguments.length) return parentBody;
    parentBody = _;
    gm = gmdat[parentBody];
    return kepler;
  };

  kepler.id = function (_) {
    if (!arguments.length) return id;
    id = _;
    symbol = ".";
    return kepler;
  };

  kepler.Name = function (_) {
    if (!arguments.length) return name;
    name = _;
    return kepler;
  };

  kepler.symbol = function (_) {
    if (!arguments.length) return symbol;
    symbol = symbols[_];
    return kepler;
  };

  function near_parabolic(E, e) {
    var anom2 = e > 1.0 ? E * E : -E * E,
      term = (e * anom2 * E) / 6.0,
      rval = (1.0 - e) * E - term,
      n = 4;

    while (Math.abs(term) > 1e-15) {
      term *= anom2 / (n * (n + 1));
      rval -= term;
      n += 2;
    }
    return rval;
  }

  function anomaly() {
    var de = dat.ephemeris,
      curr,
      err,
      trial,
      tmod,
      e = de.e,
      M = de.M,
      thresh = 1e-8,
      offset = 0.0,
      delta_curr = 1.9,
      is_negative = false,
      n_iter = 0;

    if (!M) return 0.0;

    if (e < 1.0) {
      if (M < -Math.PI || M > Math.PI) {
        tmod = Trig.normalize0(M);
        offset = M - tmod;
        M = tmod;
      }

      if (e < 0.9) {
        curr = Math.atan2(Math.sin(M), Math.cos(M) - e);
        do {
          err = (curr - e * Math.sin(curr) - M) / (1.0 - e * Math.cos(curr));
          curr -= err;
        } while (Math.abs(err) > thresh);
        return curr; // + offset;
      }
    }

    if (M < 0.0) {
      M = -M;
      is_negative = true;
    }

    curr = M;
    thresh = thresh * Math.abs(1.0 - e);
    /* Due to roundoff error,  there's no way we can hope to */
    /* get below a certain minimum threshhold anyway:        */
    if (thresh < 1e-15) {
      thresh = 1e-15;
    }
    if ((e > 0.8 && M < Math.PI / 3.0) || e > 1.0) {
      /* up to 60 degrees */
      trial = M / Math.abs(1.0 - e);

      if (trial * trial > 6.0 * Math.abs(1.0 - e)) {
        /* cubic term is dominant */
        if (M < Math.PI) {
          trial = Math.pow(6.0 * M, 1 / 3);
        } else {
          /* hyperbolic w/ 5th & higher-order terms predominant */
          trial = Trig.asinh(M / e);
        }
      }
      curr = trial;
    }
    if (e > 1.0 && M > 4.0) {
      /* hyperbolic, large-mean-anomaly case */
      curr = Math.log(M);
    }
    if (e < 1.0) {
      while (Math.abs(delta_curr) > thresh) {
        if (n_iter++ > 8) {
          err = near_parabolic(curr, e) - M;
        } else {
          err = curr - e * Math.sin(curr) - M;
        }
        delta_curr = -err / (1.0 - e * Math.cos(curr));
        curr += delta_curr;
      }
    } else {
      while (Math.abs(delta_curr) > thresh) {
        if (n_iter++ > 7) {
          err = -near_parabolic(curr, e) - M;
        } else {
          err = e * Trig.sinh(curr) - curr - M;
        }
        delta_curr = -err / (e * Trig.cosh(curr) - 1.0);
        curr += delta_curr;
      }
    }
    return is_negative ? offset - curr : offset + curr;
  }

  function trueAnomaly() {
    var x,
      y,
      r0,
      g,
      t,
      de = dat.ephemeris;

    if (de.e === 1.0) {
      /* parabolic */
      t = de.jd0 - de.T;
      g = de.w0 * t * 0.5;

      y = Math.pow(g + Math.sqrt(g * g + 1.0), 1 / 3);
      de.v = 2.0 * Math.atan(y - 1.0 / y);
    } else {
      /* got the mean anomaly;  compute eccentric,  then true */
      de.E = anomaly();
      if (de.e > 1.0) {
        /* hyperbolic case */
        x = de.e - Trig.cosh(de.E);
        y = Trig.sinh(de.E);
      } else {
        /* elliptical case */
        x = Math.cos(de.E) - de.e;
        y = Math.sin(de.E);
      }
      y *= Math.sqrt(Math.abs(1.0 - de.e * de.e));
      de.v = Math.atan2(y, x);
    }

    r0 = de.q * (1.0 + de.e);
    de.r = r0 / (1.0 + de.e * Math.cos(de.v));
  }

  function derive() {
    var de = dat.ephemeris;
    if (!de.hasOwnProperty("w")) {
      de.w = de.W - de.N;
    }
    if (!de.hasOwnProperty("M")) {
      de.M = de.L - de.W;
    }
    if (de.e < 1.0) {
      de.M = Trig.normalize0(de.M);
    }
    //de.P = Math.pow(Math.abs(de.a), 1.5);
    de.P = (τ * Math.sqrt(Math.pow(de.a, 3) / gm)) / 365.25;
    de.T = de.jd0 - de.M / halfπ / de.P;

    if (de.e !== 1.0) {
      /* for non-parabolic orbits: */
      de.q = de.a * (1.0 - de.e);
      de.t0 = de.a * Math.sqrt(Math.abs(de.a) / gm);
    } else {
      de.w0 = 3.0 / Math.sqrt(2) / (de.q * Math.sqrt(de.q / gm));
      de.a = 0.0;
      de.t0 = 0.0;
    }
    de.am = Math.sqrt(gm * de.q * (1.0 + de.e));
  }

  function transpose() {
    var de = dat.ephemeris;
    if (!de.ref || de.ref === "ecl") {
      de.tx = de.x;
      de.ty = de.y;
      de.tz = de.z;
      return;
    }
    var a0 = de.lecl, // - Math.PI/2,
      a1 = Math.PI / 2 - de.becl,
      angles = [0, a1, -a0];
    transform(de, angles);
    var tp = Trig.cartesian([de.tl, de.tb, de.r]);
    de.tx = tp.x;
    de.ty = tp.y;
    de.tz = tp.z;
  }

  function equatorial(pos) {
    var de = dat.ephemeris,
      pe = pos.ephemeris;
    ε =
      (23.439292 -
        0.0130042 * de.cy -
        1.667e-7 * de.cy * de.cy +
        5.028e-7 * de.cy * de.cy * de.cy) *
      deg2rad;
    sinε = Math.sin(ε);
    cosε = Math.cos(ε);
    var o = id === "lun" ? { x: 0, y: 0, z: 0 } : { x: pe.x, y: pe.y, z: pe.z };
    de.xeq = de.x - o.x;
    de.yeq = (de.y - o.y) * cosε - (de.z - o.z) * sinε;
    de.zeq = (de.y - o.y) * sinε + (de.z - o.z) * cosε;

    de.ra = Trig.normalize(Math.atan2(de.yeq, de.xeq));
    de.dec = Math.atan2(de.zeq, Math.sqrt(de.xeq * de.xeq + de.yeq * de.yeq));
    if (id === "lun") de = moon_corr(de, pe);
    de.pos = [de.ra / deg2rad, de.dec / deg2rad];
    de.rt = Math.sqrt(de.xeq * de.xeq + de.yeq * de.yeq + de.zeq * de.zeq);
    if (id !== "sol") de.mag = magnitude();
  }

  function magnitude() {
    var de = dat.ephemeris,
      rs = de.r,
      rt = de.rt,
      a = Math.acos((rs * rs + rt * rt - 1) / (2 * rs * rt)),
      q =
        0.666 * ((1 - a / Math.PI) * Math.cos(a) + (1 / Math.PI) * Math.sin(a)),
      m =
        dat.H * 1 +
        5 * Math.log(rs * rt) * Math.LOG10E -
        2.5 * Math.log(q) * Math.LOG10E;

    return m;
  }

  function cartesian() {
    var de = dat.ephemeris,
      u = de.v + de.w;
    de.x =
      de.r *
      (Math.cos(de.N) * Math.cos(u) -
        Math.sin(de.N) * Math.sin(u) * Math.cos(de.i));
    de.y =
      de.r *
      (Math.sin(de.N) * Math.cos(u) +
        Math.cos(de.N) * Math.sin(u) * Math.cos(de.i));
    de.z = de.r * (Math.sin(u) * Math.sin(de.i));
    return dat;
  }

  function spherical() {
    var de = dat.ephemeris,
      lon = Math.atan2(de.y, de.x),
      lat = Math.atan2(de.z, Math.sqrt(de.x * de.x + de.y * de.y));
    de.l = Trig.normalize(lon);
    de.b = lat;
    return dat;
  }

  function transform(angles) {}

  function polar2cart(pos) {
    var rclat = Math.cos(pos.lat) * pos.r;
    pos.x = rclat * Math.cos(pos.lon);
    pos.y = rclat * Math.sin(pos.lon);
    pos.z = pos.r * Math.sin(pos.lat);
    return pos;
  }

  function JD(dt) {
    var yr = dt.getUTCFullYear(),
      mo = dt.getUTCMonth() + 1,
      dy = dt.getUTCDate(),
      frac =
        (dt.getUTCHours() -
          12 +
          dt.getUTCMinutes() / 60.0 +
          dt.getUTCSeconds() / 3600.0) /
        24,
      IYMIN = -4799;

    if (yr < IYMIN) return -1;
    var a = Math.floor((14 - mo) / 12),
      y = yr + 4800 - a,
      m = mo + 12 * a - 3;
    var jdn =
      dy +
      Math.floor((153 * m + 2) / 5) +
      365 * y +
      Math.floor(y / 4) -
      Math.floor(y / 100) +
      Math.floor(y / 400) -
      32045;
    return jdn + frac;
  }

  function mst(lon) {
    var l = lon || 0;
    return (18.697374558 + 24.06570982441908 * dat.ephemeris.d) * 15 + l;
  }

  function observer(pos) {
    var flat = 298.257223563,
      re = 6378.137,
      h = pos.h || 0,
      cart = {},
      gmst = mst();

    var cosl = Math.cos(pos.lat),
      sinl = Math.sin(pos.lat),
      fl = 1.0 - 1.0 / flat;
    var fl2 = fl * fl;

    var u = 1.0 / Math.sqrt(cosl * cosl + fl2 * sinl * sinl),
      a = re * u + h,
      b = re * fl2 * u + h,
      r = Math.sqrt(a * a * cosl * cosl + b * b * sinl * sinl);

    cart.lat = Math.acos((a * cosl) / r);
    cart.lon = pos.lon;
    cart.r = h;

    if (pos.lat < 0.0) cart.lat *= -1;

    polar2cart(cart);

    var angle = gmst * deg2rad;

    cart.x = cart.x * Math.cos(angle) - cart.y * Math.sin(angle);
    cart.y = cart.x * Math.sin(angle) + cart.y * Math.cos(angle);
    return cart;
  }

  function moon_elements(dat) {
    if (typeof Moon !== "undefined") return Moon.elements(dat);
  }

  function moon_corr(dat, pos) {
    spherical();
    if (typeof Moon !== "undefined") return Moon.corr(dat, pos);
  }

  return kepler;
};
