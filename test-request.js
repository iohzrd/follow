const { tor } = require("@iohzrd/granax");
var tr = require("tor-request");

const torRequestPromise = onion => {
  return new Promise((resolve, reject) => {
    tr.request(onion, function(err, res, body) {
      if (err) reject({});
      if (!err && res.statusCode == 200) {
        resolve(body);
      }
    });
  });
};

async function main() {
  const res = await torRequestPromise(
    "http://7irtjmsbszymu5uyjkeqe4ulll27m5yxy3uq77npe7r6pqgve2ymjiyd.onion"
  ).catch(err => {
    console.log(err);
  });

  console.log(res);
  console.log(Boolean(res));
}
main();
