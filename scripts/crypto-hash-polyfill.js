const crypto = require('crypto');
if (typeof crypto.hash !== 'function') {
  crypto.hash = (algorithm, input, outputEncoding = 'hex') => {
    const h = crypto.createHash(algorithm);
    h.update(input);
    if (outputEncoding === 'buffer') {
      return h.digest();
    }
    return h.digest(outputEncoding);
  };
}
