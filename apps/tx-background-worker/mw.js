const mw1 = (req, res, next) => {
  console.log('Middleware 1');
  next();
  console.log('Middleware 1 after next');
}

const mw2 = (req, res, next) => {
  console.log('Middleware 2');
  next();
  console.log('Middleware 2 after next');
}

const mw3 = (req, res, next) => {
  console.log('Middleware 3');
  next();
  console.log('Middleware 3 after next');
}

const handler = (req, res) => {
  res.end('Hello, World!');
}

const server = {}
server.middlewares = [mw1, mw2, mw3];
server.handler = handler;

function callMiddlewares(req, res, middlewares, handler) {
  wrapMiddleware(middlewares, req, res, () => {
    handler(req, res);
  })();
}

function wrapMiddleware(middlewares, req, res, next) {
  for (let i = middlewares.length - 1; i >= 0; i--) {
    const currentMiddleware = middlewares[i];
    const previousNext = next;
    next = () => currentMiddleware(req, res, previousNext);
  }
  return next;
}

// Simulate a request
const req = {
  url: '/test'
};
const res = {
  end: (message) => console.log(message)
};

callMiddlewares(req, res, server.middlewares, server.handler);

function wrapWithLog(fn, label) {
  return () => {
    console.log(`Before ${label}`);
    fn();
    console.log(`After ${label}`);
  };
}

let chain = () => console.log('Core Functionality');

chain = wrapWithLog(chain, 'Layer 1')
chain = wrapWithLog(chain, 'Layer 2')
chain = wrapWithLog(chain, 'Layer 3')

chain();