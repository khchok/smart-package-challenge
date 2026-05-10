// suspend behaviour test
let r;
const a = async () => {
  await new Promise((resolve) => {
    r = resolve;
    console.log("resolve");
  });
};

const b = async () => {
  await a();
  console.log("b done");
};

b();
console.log("wait");
r();
