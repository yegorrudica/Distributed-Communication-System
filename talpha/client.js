/*
'use strict';

const buildAPI = methods => {
  const api = {};
  for (const method of methods) {
    api[method] = (args = {}) => new Promise((resolve, reject) => {
      const url = `/api/${method}`;
      console.log(url, args);
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args),
      }).then(res => {
        const { status } = res;
        if (status === 200) resolve(res.json());
        else reject(new Error(`Status Code: ${status}`));
      });
    });
  }
  return api;
};

const api = buildAPI([
  'getUser',
  'signIn',
]);

const getUser = async () => {
  const signIn = await api.signIn({ login: 'berniesanders', password: 'GreenNewDeal' });
  console.log(signIn);
  const result = await api.getUser('jacquefresco');
  const output = document.getElementById('output');
  console.log(result);
  output.innerHTML = 'HTTP GET /api/getUser<br>' + JSON.stringify(result);
};

getUser();
*/
